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

type DataResponse struct {
	Message   string `json:"message"`
	Processed int    `json:"processed"`
	Duration  string `json:"duration_ms"`
}

func main() {
	config := loadConfig()
	
	// Set up HTTP routes
	http.HandleFunc("/health", healthHandler(config))
	http.HandleFunc("/api/v1/process", processHandler(config))
	http.HandleFunc("/api/v1/stats", statsHandler(config))

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

func processHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Simulate business logic processing
		// In a real service, this might involve database operations, calculations, etc.
		time.Sleep(10 * time.Millisecond) // Simulate processing time
		
		duration := time.Since(start)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		response := DataResponse{
			Message:   "Data processed successfully",
			Processed: 42, // Example processed count
			Duration:  fmt.Sprintf("%.2f", duration.Seconds()*1000),
		}

		json.NewEncoder(w).Encode(response)
	}
}

func statsHandler(config Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		stats := map[string]interface{}{
			"service":     config.ServiceName,
			"uptime":      "N/A", // Could implement actual uptime tracking
			"requests":    0,     // Could implement request counting
			"version":     "1.0.0",
			"environment": os.Getenv("ENVIRONMENT"),
		}

		json.NewEncoder(w).Encode(stats)
	}
}

