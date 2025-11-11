#!/usr/bin/env python3
"""
RabbitMQ worker for the analytics service.

Consumes messages from a queue and simulates downstream processing.
"""

import io
import json
import os
import signal
import sys
import time
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import pika
import psycopg
from minio import Minio
from minio.error import S3Error
from psycopg.rows import dict_row
from pymongo import MongoClient


def _json_default(value: Any) -> Any:
    """Helper to JSON-serialise Decimal and datetime objects."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


class RabbitWorker:
    """RabbitMQ consumer that builds analytics from Postgres data."""

    def __init__(self) -> None:
        self.queue_name = os.getenv("RABBITMQ_QUEUE", "analytics.events")
        self.prefetch_count = int(os.getenv("RABBITMQ_PREFETCH", "10"))

        # RabbitMQ connection bits
        self._connection = None
        self._channel = None

        # Postgres
        self.pg_conn = None
        self.pg_dsn = self._build_postgres_dsn()

        # MongoDB
        self.mongo_client: Optional[MongoClient] = None
        self.mongo_collection = None

        # MinIO
        self.minio_client: Optional[Minio] = None
        self.minio_bucket = os.getenv("MINIO_BUCKET", "analytics-reports")
        self.minio_secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

    def _build_postgres_dsn(self) -> str:
        params = {
            "host": os.getenv("POSTGRES_HOST", "postgresql-postgresql"),
            "port": os.getenv("POSTGRES_PORT", "5432"),
            "dbname": os.getenv("POSTGRES_DB", "portfolio"),
            "user": os.getenv("POSTGRES_USER"),
            "password": os.getenv("POSTGRES_PASSWORD"),
            "sslmode": os.getenv("POSTGRES_SSLMODE", "disable"),
        }
        missing = [key for key, value in params.items() if not value and key in {"user", "password"}]
        if missing:
            raise RuntimeError(f"Postgres credentials missing: {', '.join(missing)}")
        return " ".join(f"{k}={v}" for k, v in params.items())

    def _init_postgres(self) -> None:
        self.pg_conn = psycopg.connect(self.pg_dsn, row_factory=dict_row)
        self.pg_conn.autocommit = True
        print("[worker] Connected to PostgreSQL")

    def _init_mongo(self) -> None:
        username = os.getenv("MONGODB_USERNAME")
        password = os.getenv("MONGODB_PASSWORD")
        host = os.getenv("MONGODB_HOST", "mongodb-mongodb")
        port = os.getenv("MONGODB_PORT", "27017")
        auth_source = os.getenv("MONGODB_AUTH_SOURCE", "admin")
        database = os.getenv("MONGODB_DATABASE", "analytics")
        collection = os.getenv("MONGODB_COLLECTION", "transactions_summary")

        if not username or not password:
            raise RuntimeError("MongoDB credentials are required")

        mongo_uri = f"mongodb://{username}:{password}@{host}:{port}/?authSource={auth_source}"
        self.mongo_client = MongoClient(mongo_uri, tls=False)
        self.mongo_collection = self.mongo_client[database][collection]
        print("[worker] Connected to MongoDB")

    def _init_minio(self) -> None:
        endpoint = os.getenv("MINIO_ENDPOINT", "minio-minio:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY")
        secret_key = os.getenv("MINIO_SECRET_KEY")

        if not access_key or not secret_key:
            raise RuntimeError("MinIO credentials are required")

        self.minio_client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=self.minio_secure,
        )

        assert self.minio_client is not None
        if not self.minio_client.bucket_exists(self.minio_bucket):
            self.minio_client.make_bucket(self.minio_bucket)
            print(f"[worker] Created MinIO bucket {self.minio_bucket}")
        else:
            print(f"[worker] Using MinIO bucket {self.minio_bucket}")

    def connect(self) -> None:
        """Establish connections to all backends."""
        self._init_postgres()
        self._init_mongo()
        self._init_minio()
        self._connect_rabbitmq()

    def _connect_rabbitmq(self) -> None:
        host = os.getenv("RABBITMQ_HOST", "rabbitmq-rabbitmq")
        port = int(os.getenv("RABBITMQ_PORT", "5672"))
        username = os.getenv("RABBITMQ_USERNAME")
        password = os.getenv("RABBITMQ_PASSWORD")
        virtual_host = os.getenv("RABBITMQ_VHOST", "/")

        if not username or not password:
            raise RuntimeError("RabbitMQ credentials are required")

        credentials = pika.PlainCredentials(username, password)
        parameters = pika.ConnectionParameters(
            host=host,
            port=port,
            virtual_host=virtual_host,
            credentials=credentials,
            heartbeat=30,
            blocked_connection_timeout=30,
        )
        self._connection = pika.BlockingConnection(parameters)
        self._channel = self._connection.channel()

        self._channel.queue_declare(queue=self.queue_name, durable=True)
        self._channel.basic_qos(prefetch_count=self.prefetch_count)
        print(f"[worker] Connected to RabbitMQ at {host}:{port}, queue={self.queue_name}")

    def start(self) -> None:
        if not self._channel:
            raise RuntimeError("Call connect() before start()")

        def callback(ch, method, properties, body):
            start_time = time.time()
            try:
                payload = json.loads(body.decode("utf-8"))
            except json.JSONDecodeError:
                print("[worker] Received invalid JSON payload, discarding")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            try:
                self.process_message(payload)
            except Exception as exc:  # pylint: disable=broad-except
                print(f"[worker] Error processing message: {exc}")
            finally:
                elapsed = (time.time() - start_time) * 1000
                print(f"[worker] Processed message in {elapsed:.2f} ms")
                ch.basic_ack(delivery_tag=method.delivery_tag)

        self._channel.basic_consume(queue=self.queue_name, on_message_callback=callback)
        print("[worker] Waiting for messages. Press Ctrl+C to exit.")
        self._channel.start_consuming()

    def process_message(self, payload: Dict[str, Any]) -> None:
        event_payload: Dict[str, Any] = payload
        if isinstance(payload, dict) and "payload" in payload:
            inner = payload.get("payload")
            if isinstance(inner, dict):
                event_payload = inner

        transaction_id = (
            event_payload.get("transactionId")
            or event_payload.get("transaction_id")
            or event_payload.get("transactionID")
        )
        if not transaction_id:
            event_type = payload.get("eventType") if isinstance(payload, dict) else None
            print(f"[worker] Transaction ID missing, skipping (eventType={event_type})")
            return

        try:
            uuid_obj = UUID(str(transaction_id))
        except ValueError:
            print(f"[worker] Invalid transaction ID format: {transaction_id}")
            return

        transaction = self._fetch_transaction(uuid_obj)
        if not transaction:
            print(f"[worker] Transaction {transaction_id} not found in Postgres")
            return

        analytics = self._build_analytics(transaction)
        object_key = self._upload_report(transaction_id, analytics)
        self._persist_analytics(transaction_id, analytics, object_key)

    def _fetch_transaction(self, transaction_id: UUID) -> Optional[Dict[str, Any]]:
        if not self.pg_conn:
            raise RuntimeError("Postgres connection not initialised")

        with self.pg_conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, customer_id, subtotal, tax, discount, total, currency, created_at
                FROM transactions
                WHERE id = %s
                """,
                (transaction_id,),
            )
            txn = cur.fetchone()

            if not txn:
                return None

            cur.execute(
                """
                SELECT product_id, name, category, unit_price, quantity
                FROM transaction_items
                WHERE transaction_id = %s
                """,
                (transaction_id,),
            )
            items = cur.fetchall()

        txn["items"] = items or []
        return txn

    def _build_analytics(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        items: List[Dict[str, Any]] = transaction.get("items", [])
        category_totals: Dict[str, Dict[str, float]] = defaultdict(lambda: {"revenue": 0.0, "quantity": 0})
        total_quantity = 0

        for item in items:
            category = item.get("category") or "uncategorised"
            unit_price = float(item.get("unit_price", 0))
            quantity = int(item.get("quantity", 0))
            revenue = unit_price * quantity

            category_totals[category]["revenue"] += revenue
            category_totals[category]["quantity"] += quantity
            total_quantity += quantity

        category_summary = [
            {
                "category": category,
                "revenue": round(values["revenue"], 2),
                "quantity": values["quantity"],
            }
            for category, values in category_totals.items()
        ]

        return {
            "transaction_id": str(transaction["id"]),
            "customer_id": str(transaction.get("customer_id")) if transaction.get("customer_id") else None,
            "created_at": transaction.get("created_at"),
            "currency": transaction.get("currency", "USD"),
            "totals": {
                "subtotal": float(transaction.get("subtotal", 0)),
                "tax": float(transaction.get("tax", 0)),
                "discount": float(transaction.get("discount", 0)),
                "total": float(transaction.get("total", 0)),
                "items": total_quantity,
            },
            "category_breakdown": category_summary,
            "generated_at": datetime.utcnow(),
        }

    def _upload_report(self, transaction_id: str, analytics: Dict[str, Any]) -> str:
        if not self.minio_client:
            raise RuntimeError("MinIO client not initialised")

        object_key = f"transactions/{transaction_id}.json"
        payload = json.dumps(analytics, default=_json_default, indent=2).encode("utf-8")
        data_stream = io.BytesIO(payload)

        try:
            self.minio_client.put_object(
                self.minio_bucket,
                object_key,
                data_stream,
                length=len(payload),
                content_type="application/json",
            )
            return object_key
        except S3Error as exc:
            raise RuntimeError(f"Failed to upload report to MinIO: {exc}") from exc

    def _persist_analytics(self, transaction_id: str, analytics: Dict[str, Any], object_key: str) -> None:
        if self.mongo_collection is None:
            raise RuntimeError("MongoDB collection not initialised")

        document = {
            **analytics,
            "report": {
                "bucket": self.minio_bucket,
                "object_key": object_key,
                "secure": self.minio_secure,
            },
            "last_updated": datetime.utcnow(),
        }

        result = self.mongo_collection.update_one(
            {"transaction_id": transaction_id},
            {"$set": document},
            upsert=True,
        )
        matched = result.matched_count if result else 0
        action = "updated" if matched else "inserted"
        print(f"[worker] Stored analytics for transaction {transaction_id} ({action})")

    def close(self) -> None:
        if self._channel and self._channel.is_open:
            self._channel.close()
        if self._connection and self._connection.is_open:
            self._connection.close()
        if self.pg_conn:
            try:
                self.pg_conn.close()
            except psycopg.Error:
                pass
        if self.mongo_client:
            self.mongo_client.close()
        # MinIO client does not need explicit close


def handle_shutdown(worker: RabbitWorker):
    """Signal handler to stop consuming without losing messages."""

    def _handler(signum, frame):
        print(f"\n[worker] Received signal {signum}, shutting down...")
        worker.close()
        sys.exit(0)

    return _handler


def main():
    worker = RabbitWorker()
    signal.signal(signal.SIGINT, handle_shutdown(worker))
    signal.signal(signal.SIGTERM, handle_shutdown(worker))

    try:
        worker.connect()
        worker.start()
    except KeyboardInterrupt:
        print("\n[worker] Interrupted by user")
    except Exception as exc:  # pylint: disable=broad-except
        print(f"[worker] Fatal error: {exc}")
        sys.exit(1)
    finally:
        worker.close()


if __name__ == "__main__":
    main()

