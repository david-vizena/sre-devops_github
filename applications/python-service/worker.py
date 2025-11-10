#!/usr/bin/env python3
"""
RabbitMQ worker for the analytics service.

Consumes messages from a queue and simulates downstream processing.
"""

import json
import os
import signal
import sys
import time

import pika


class RabbitWorker:
    """Simple RabbitMQ consumer with graceful shutdown."""

    def __init__(self) -> None:
        self.queue_name = os.getenv("RABBITMQ_QUEUE", "analytics.events")
        self.prefetch_count = int(os.getenv("RABBITMQ_PREFETCH", "10"))
        self._connection = None
        self._channel = None

    def connect(self) -> None:
        """Establish connection to RabbitMQ using environment variables."""
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

        # Ensure the queue exists; durable keeps messages after broker restart.
        self._channel.queue_declare(queue=self.queue_name, durable=True)
        self._channel.basic_qos(prefetch_count=self.prefetch_count)
        print(f"[worker] Connected to RabbitMQ at {host}:{port}, queue={self.queue_name}")

    def start(self) -> None:
        """Begin consuming messages."""
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

            self.process_message(payload)
            elapsed = (time.time() - start_time) * 1000
            print(f"[worker] Processed message in {elapsed:.2f} ms")
            ch.basic_ack(delivery_tag=method.delivery_tag)

        self._channel.basic_consume(queue=self.queue_name, on_message_callback=callback)
        print("[worker] Waiting for messages. Press Ctrl+C to exit.")
        self._channel.start_consuming()

    def process_message(self, payload: dict) -> None:
        """Placeholder for analytics logic."""
        transaction_id = payload.get("transaction_id", "unknown")
        event_type = payload.get("event_type", "transaction.created")
        amount = payload.get("amount", 0)
        print(f"[worker] Handling event={event_type} transaction_id={transaction_id} amount={amount}")
        # Simulate heavy work for demonstration
        time.sleep(0.5)

    def close(self) -> None:
        """Close connection gracefully."""
        if self._channel and self._channel.is_open:
            self._channel.close()
        if self._connection and self._connection.is_open:
            self._connection.close()


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

