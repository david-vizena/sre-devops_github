package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type Config struct {
	Port        string
	ServiceName string
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
	Service         string  `json:"service"`
	TotalTransactions int   `json:"total_transactions"`
	TotalRevenue     float64 `json:"total_revenue"`
	AverageOrderValue float64 `json:"average_order_value"`
	Version          string  `json:"version"`
	Environment      string  `json:"environment"`
}

var (
	transactionCount int
	totalRevenue    float64
)

const (
	TAX_RATE = 0.08 // 8% tax rate
)

func main() {
	config := loadConfig()
	
	// Set up HTTP routes
	http.HandleFunc("/health", healthHandler(config))
	http.HandleFunc("/api/v1/process-transaction", processTransactionHandler(config))
	http.HandleFunc("/api/v1/stats", statsHandler(config))
	http.HandleFunc("/metrics", metricsHandler(config))

	// Graceful shutdown handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting %s on port %s", config.ServiceName, config.Port)
		if err := http.ListenAndServe(":"+config.Port, nil); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-sigChan
	log.Println("Shutting down gracefully...")
	time.Sleep(1 * time.Second)
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

	return Config{
		Port:        port,
		ServiceName: serviceName,
	}
}

func healthHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		
		response := HealthResponse{
			Status:    "healthy",
			Service:   config.ServiceName,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
		
		json.NewEncoder(w).Encode(response)
	}
}

func processTransactionHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		// Validate request
		if len(req.Items) == 0 {
			http.Error(w, "Transaction must contain at least one item", http.StatusBadRequest)
			return
		}

		// Business Logic: Calculate subtotal
		subtotal := calculateSubtotal(req.Items)

		// Business Logic: Apply discount
		discount := applyDiscount(subtotal, req.DiscountCode)

		// Business Logic: Calculate tax (on subtotal after discount)
		tax := calculateTax(subtotal-discount, TAX_RATE)

		// Business Logic: Calculate total
		total := subtotal - discount + tax

		// Generate transaction ID
		transactionID := fmt.Sprintf("TXN-%d-%d", time.Now().Unix(), transactionCount+1)

		// Update service statistics
		transactionCount++
		totalRevenue += total

		duration := time.Since(start)

		response := TransactionResponse{
			TransactionID:  transactionID,
			CustomerID:     req.CustomerID,
			Items:          req.Items,
			Subtotal:       subtotal,
			Tax:            tax,
			Discount:       discount,
			Total:          total,
			Timestamp:      time.Now().UTC().Format(time.RFC3339),
			ProcessingTime: fmt.Sprintf("%.2f", duration.Seconds()*1000),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
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

func statsHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		var avgOrderValue float64
		if transactionCount > 0 {
			avgOrderValue = totalRevenue / float64(transactionCount)
		}

		stats := ServiceStats{
			Service:            config.ServiceName,
			TotalTransactions:  transactionCount,
			TotalRevenue:       totalRevenue,
			AverageOrderValue:  avgOrderValue,
			Version:            "1.0.0",
			Environment:        os.Getenv("ENVIRONMENT"),
		}

		json.NewEncoder(w).Encode(stats)
	}
}

// Prometheus metrics endpoint
func metricsHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		
		// Prometheus-compatible metrics
		fmt.Fprintf(w, "# HELP http_requests_total Total number of HTTP requests\n")
		fmt.Fprintf(w, "# TYPE http_requests_total counter\n")
		fmt.Fprintf(w, "http_requests_total{service=\"%s\",method=\"total\"} %d\n", config.ServiceName, transactionCount)
		
		fmt.Fprintf(w, "# HELP http_request_duration_seconds Request duration in seconds\n")
		fmt.Fprintf(w, "# TYPE http_request_duration_seconds histogram\n")
		fmt.Fprintf(w, "http_request_duration_seconds{service=\"%s\",quantile=\"0.5\"} 0.05\n", config.ServiceName)
		fmt.Fprintf(w, "http_request_duration_seconds{service=\"%s\",quantile=\"0.95\"} 0.1\n", config.ServiceName)
		fmt.Fprintf(w, "http_request_duration_seconds{service=\"%s\",quantile=\"0.99\"} 0.2\n", config.ServiceName)
		
		fmt.Fprintf(w, "# HELP service_revenue_total Total revenue processed\n")
		fmt.Fprintf(w, "# TYPE service_revenue_total counter\n")
		fmt.Fprintf(w, "service_revenue_total{service=\"%s\"} %.2f\n", config.ServiceName, totalRevenue)
		
		fmt.Fprintf(w, "# HELP service_up Service availability\n")
		fmt.Fprintf(w, "# TYPE service_up gauge\n")
		fmt.Fprintf(w, "service_up{service=\"%s\"} 1\n", config.ServiceName)
	}
}
