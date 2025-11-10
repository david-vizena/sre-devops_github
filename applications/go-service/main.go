package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	Port             string
	ServiceName      string
	Environment      string
	DBHost           string
	DBPort           string
	DBName           string
	DBUser           string
	DBPassword       string
	DBSSLMode        string
	DBMaxConns       int32
	DBConnectTimeout time.Duration
	ShutdownTimeout  time.Duration
}

type HealthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Timestamp string `json:"timestamp"`
}

// Transaction request structure
type TransactionRequest struct {
	Items      []Item  `json:"items"`
	CustomerID string `json:"customer_id"`
	DiscountCode string `json:"discount_code,omitempty"`
}

type Item struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
	Category string  `json:"category"`
}

// Transaction response structure
type TransactionResponse struct {
	TransactionID string            `json:"transaction_id"`
	CustomerID    string            `json:"customer_id"`
	Items         []Item            `json:"items"`
	Subtotal      float64           `json:"subtotal"`
	Tax           float64           `json:"tax"`
	Discount      float64           `json:"discount"`
	Total         float64           `json:"total"`
	Timestamp     string            `json:"timestamp"`
	ProcessingTime string           `json:"processing_time_ms"`
}

// Service statistics
type ServiceStats struct {
	Service            string  `json:"service"`
	TotalTransactions  int64   `json:"total_transactions"`
	TotalRevenue       float64 `json:"total_revenue"`
	AverageOrderValue  float64 `json:"average_order_value"`
	Version            string  `json:"version"`
	Environment        string  `json:"environment"`
}

const (
	TAX_RATE = 0.08 // 8% tax rate
)

type Server struct {
	config Config
	db     *pgxpool.Pool
}

func main() {
	config := loadConfig()

	ctx := context.Background()
	dbPool, err := initDatabase(ctx, config)
	if err != nil {
		log.Fatalf("failed to connect to Postgres: %v", err)
	}
	defer dbPool.Close()

	if err := runMigrations(ctx, dbPool); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	server := &Server{
		config: config,
		db:     dbPool,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", server.healthHandler)
	mux.HandleFunc("/api/v1/process-transaction", server.processTransactionHandler)
	mux.HandleFunc("/api/v1/stats", server.statsHandler)
	mux.HandleFunc("/metrics", server.metricsHandler)

	httpServer := &http.Server{
		Addr:         ":" + config.Port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting %s on port %s", config.ServiceName, config.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-sigChan
	log.Println("Shutdown signal received, terminating gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

func loadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	serviceName := os.Getenv("SERVICE_NAME")
	if serviceName == "" {
		serviceName = "go-service"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "production"
	}

	dbHost := os.Getenv("POSTGRES_HOST")
	if dbHost == "" {
		dbHost = "postgresql-postgresql.data-services.svc.cluster.local"
	}

	dbPort := os.Getenv("POSTGRES_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbName := os.Getenv("POSTGRES_DB")
	if dbName == "" {
		dbName = "portfolio"
	}

	dbUser := os.Getenv("POSTGRES_USER")
	if dbUser == "" {
		dbUser = "app_user"
	}

	dbPassword := os.Getenv("POSTGRES_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}

	dbSSLMode := os.Getenv("POSTGRES_SSLMODE")
	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	var dbMaxConns int32 = 4
	if val := os.Getenv("POSTGRES_MAX_CONNS"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			dbMaxConns = int32(parsed)
		}
	}

	connectTimeout := 10 * time.Second
	if val := os.Getenv("POSTGRES_CONNECT_TIMEOUT"); val != "" {
		if parsed, err := time.ParseDuration(val); err == nil {
			connectTimeout = parsed
		}
	}

	shutdownTimeout := 5 * time.Second
	if val := os.Getenv("SHUTDOWN_TIMEOUT"); val != "" {
		if parsed, err := time.ParseDuration(val); err == nil {
			shutdownTimeout = parsed
		}
	}

	return Config{
		Port:             port,
		ServiceName:      serviceName,
		Environment:      env,
		DBHost:           dbHost,
		DBPort:           dbPort,
		DBName:           dbName,
		DBUser:           dbUser,
		DBPassword:       dbPassword,
		DBSSLMode:        dbSSLMode,
		DBMaxConns:       dbMaxConns,
		DBConnectTimeout: connectTimeout,
		ShutdownTimeout:  shutdownTimeout,
	}
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	dbErr := s.db.Ping(ctx)

	status := "healthy"
	if dbErr != nil {
		status = "degraded"
	}

	response := HealthResponse{
		Status:    status,
		Service:   s.config.ServiceName,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	_ = json.NewEncoder(w).Encode(response)
}

func (s *Server) processTransactionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	start := time.Now()

	var req TransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Items) == 0 {
		http.Error(w, "Transaction must contain at least one item", http.StatusBadRequest)
		return
	}

	subtotal := calculateSubtotal(req.Items)
	discount := applyDiscount(subtotal, req.DiscountCode)
	tax := calculateTax(subtotal-discount, TAX_RATE)
	total := subtotal - discount + tax

	transactionID := uuid.New()

	var customerUUID pgtype.UUID
	if req.CustomerID != "" {
		if parsed, err := uuid.Parse(req.CustomerID); err == nil {
			customerUUID = pgtype.UUID{
				Bytes: parsed,
				Valid: true,
			}
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	response := TransactionResponse{
		TransactionID: transactionID.String(),
		CustomerID:    req.CustomerID,
		Items:         req.Items,
		Subtotal:      subtotal,
		Tax:           tax,
		Discount:      discount,
		Total:         total,
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	}

	rawPayload, _ := json.Marshal(response)

	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (id, customer_id, subtotal, tax, discount, total, raw_payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, transactionID, customerUUID, subtotal, tax, discount, total, rawPayload)
	if err != nil {
		http.Error(w, "Failed to persist transaction", http.StatusInternalServerError)
		return
	}

	for _, item := range req.Items {
		itemID := uuid.New()
		metadata, _ := json.Marshal(map[string]any{
			"source":   "go-service",
			"category": item.Category,
		})

		_, err = tx.Exec(ctx, `
			INSERT INTO transaction_items (
				id, transaction_id, product_id, name, category, unit_price, quantity, metadata
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, itemID, transactionID, item.ID, item.Name, item.Category, item.Price, item.Quantity, metadata)
		if err != nil {
			http.Error(w, "Failed to persist transaction items", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	duration := time.Since(start)
	response.ProcessingTime = fmt.Sprintf("%.2f", duration.Seconds()*1000)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

// Business Logic: Calculate subtotal from items
func calculateSubtotal(items []Item) float64 {
	var subtotal float64
	for _, item := range items {
		if item.Quantity <= 0 || item.Price < 0 {
			continue // Skip invalid items
		}
		subtotal += item.Price * float64(item.Quantity)
	}
	return subtotal
}

// Business Logic: Apply discount codes
func applyDiscount(subtotal float64, discountCode string) float64 {
	if discountCode == "" {
		return 0
	}

	// Discount rules
	discounts := map[string]float64{
		"SAVE10":  0.10, // 10% off
		"SAVE20":  0.20, // 20% off
		"WELCOME": 0.15, // 15% off for new customers
		"VIP":     0.25, // 25% off for VIP customers
	}

	if discount, exists := discounts[discountCode]; exists {
		return subtotal * discount
	}

	return 0
}

// Business Logic: Calculate tax
func calculateTax(subtotal float64, taxRate float64) float64 {
	return subtotal * taxRate
}

func (s *Server) statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	var count int64
	var revenue float64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM transactions`).Scan(&count, &revenue)
	if err != nil {
		http.Error(w, "Failed to fetch statistics", http.StatusInternalServerError)
		return
	}

	avg := 0.0
	if count > 0 {
		avg = revenue / float64(count)
	}

	stats := ServiceStats{
		Service:           s.config.ServiceName,
		TotalTransactions: count,
		TotalRevenue:      revenue,
		AverageOrderValue: avg,
		Version:           "1.0.0",
		Environment:       s.config.Environment,
	}

	_ = json.NewEncoder(w).Encode(stats)
}

// Prometheus metrics endpoint
func (s *Server) metricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	var count int64
	var revenue float64
	err := s.db.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM transactions`).Scan(&count, &revenue)
	if err != nil {
		http.Error(w, "Failed to fetch metrics", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "# HELP http_requests_total Total number of processed transactions\n")
	fmt.Fprintf(w, "# TYPE http_requests_total counter\n")
	fmt.Fprintf(w, "http_requests_total{service=\"%s\",method=\"total\"} %d\n", s.config.ServiceName, count)

	fmt.Fprintf(w, "# HELP service_revenue_total Total revenue processed\n")
	fmt.Fprintf(w, "# TYPE service_revenue_total counter\n")
	fmt.Fprintf(w, "service_revenue_total{service=\"%s\"} %.2f\n", s.config.ServiceName, revenue)

	fmt.Fprintf(w, "# HELP service_up Service availability\n")
	fmt.Fprintf(w, "# TYPE service_up gauge\n")
	fmt.Fprintf(w, "service_up{service=\"%s\"} 1\n", s.config.ServiceName)
}
