#include <iostream>
#include <string>
#include <sstream>
#include <map>
#include <cmath>
#include <chrono>
#include <ctime>
#include <iomanip>

#ifdef _WIN32
    #include <winsock2.h>
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
#endif

class SimpleHTTPServer {
private:
    int port;
    int server_fd;

public:
    SimpleHTTPServer(int p) : port(p), server_fd(-1) {}

    bool start() {
#ifdef _WIN32
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
            std::cerr << "WSAStartup failed" << std::endl;
            return false;
        }
#endif

        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (server_fd < 0) {
            std::cerr << "Socket creation failed" << std::endl;
            return false;
        }

        int opt = 1;
#ifdef _WIN32
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
#else
        setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

        struct sockaddr_in address;
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = INADDR_ANY;
        address.sin_port = htons(port);

        if (bind(server_fd, (struct sockaddr*)&address, sizeof(address)) < 0) {
            std::cerr << "Bind failed" << std::endl;
            return false;
        }

        if (listen(server_fd, 10) < 0) {
            std::cerr << "Listen failed" << std::endl;
            return false;
        }

        std::cout << "C++ Service listening on port " << port << std::endl;
        return true;
    }

    std::string handleRequest(const std::string& method, const std::string& path, const std::string& body) {
        if (path == "/health") {
            return healthCheck();
        } else if (path == "/api/v1/calculate" && method == "POST") {
            return calculateRisk(body);
        } else if (path == "/api/v1/stats") {
            return getStats();
        } else {
            return "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\n\r\n{\"error\":\"Not Found\"}";
        }
    }

    std::string healthCheck() {
        auto now = std::chrono::system_clock::now();
        auto time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::gmtime(&time_t), "%Y-%m-%dT%H:%M:%SZ");
        
        std::string json = R"({"status":"healthy","service":"cpp-service","timestamp":")" + ss.str() + "\"}";
        return "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + 
               std::to_string(json.length()) + "\r\n\r\n" + json;
    }

    std::string calculateRisk(const std::string& body) {
        // Parse JSON-like input (simplified - in production use a JSON library)
        // Expected format: {"amount":1000.0,"customer_score":750,"transaction_count":5}
        
        double amount = 0.0;
        double customer_score = 0.0;
        int transaction_count = 0;
        
        // Simple JSON parsing (for demo - use proper library in production)
        // Find and extract values, handling whitespace
        size_t amount_pos = body.find("\"amount\"");
        size_t score_pos = body.find("\"customer_score\"");
        size_t count_pos = body.find("\"transaction_count\"");
        
        if (amount_pos != std::string::npos) {
            // Find the colon after "amount"
            size_t colon = body.find(':', amount_pos);
            if (colon != std::string::npos) {
                // Skip whitespace and find the number
                size_t num_start = colon + 1;
                while (num_start < body.length() && (body[num_start] == ' ' || body[num_start] == '\t')) {
                    num_start++;
                }
                // Find end of number (comma, space, or closing brace)
                size_t num_end = num_start;
                while (num_end < body.length() && 
                       body[num_end] != ',' && body[num_end] != '}' && 
                       body[num_end] != ' ' && body[num_end] != '\n' && body[num_end] != '\r') {
                    num_end++;
                }
                try {
                    amount = std::stod(body.substr(num_start, num_end - num_start));
                } catch (...) {
                    amount = 0.0;
                }
            }
        }
        
        if (score_pos != std::string::npos) {
            size_t colon = body.find(':', score_pos);
            if (colon != std::string::npos) {
                size_t num_start = colon + 1;
                while (num_start < body.length() && (body[num_start] == ' ' || body[num_start] == '\t')) {
                    num_start++;
                }
                size_t num_end = num_start;
                while (num_end < body.length() && 
                       body[num_end] != ',' && body[num_end] != '}' && 
                       body[num_end] != ' ' && body[num_end] != '\n' && body[num_end] != '\r') {
                    num_end++;
                }
                try {
                    customer_score = std::stod(body.substr(num_start, num_end - num_start));
                } catch (...) {
                    customer_score = 0.0;
                }
            }
        }
        
        if (count_pos != std::string::npos) {
            size_t colon = body.find(':', count_pos);
            if (colon != std::string::npos) {
                size_t num_start = colon + 1;
                while (num_start < body.length() && (body[num_start] == ' ' || body[num_start] == '\t')) {
                    num_start++;
                }
                size_t num_end = num_start;
                while (num_end < body.length() && 
                       body[num_end] != ',' && body[num_end] != '}' && 
                       body[num_end] != ' ' && body[num_end] != '\n' && body[num_end] != '\r') {
                    num_end++;
                }
                try {
                    transaction_count = std::stoi(body.substr(num_start, num_end - num_start));
                } catch (...) {
                    transaction_count = 0;
                }
            }
        }
        
        // High-performance risk calculation algorithm
        auto start = std::chrono::high_resolution_clock::now();
        
        // Risk factors:
        // 1. Amount-based risk (logarithmic scale)
        double amount_risk = std::log10(std::max(amount, 1.0)) / 6.0; // Normalize to 0-1
        
        // 2. Customer score risk (inverse relationship)
        double score_risk = 1.0 - (customer_score / 1000.0);
        score_risk = std::max(0.0, std::min(1.0, score_risk));
        
        // 3. Transaction frequency risk
        double frequency_risk = 1.0 - std::exp(-transaction_count / 10.0);
        
        // Weighted risk calculation
        double total_risk = (amount_risk * 0.4) + (score_risk * 0.4) + (frequency_risk * 0.2);
        total_risk = std::max(0.0, std::min(1.0, total_risk));
        
        // Risk level categorization
        std::string risk_level;
        if (total_risk < 0.3) {
            risk_level = "low";
        } else if (total_risk < 0.7) {
            risk_level = "medium";
        } else {
            risk_level = "high";
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        
        // Generate JSON response
        std::stringstream json;
        json << R"({"risk_score":)" << total_risk << 
                R"(,"risk_level":")" << risk_level << 
                R"(,"amount_risk":)" << amount_risk << 
                R"(,"score_risk":)" << score_risk << 
                R"(,"frequency_risk":)" << frequency_risk << 
                R"(,"processing_time_us":)" << duration.count() << 
                R"(,"recommendation":")" << (total_risk > 0.7 ? "review_required" : "approve") << "\"}";
        
        std::string response = json.str();
        return "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + 
               std::to_string(response.length()) + "\r\n\r\n" + response;
    }

    std::string getStats() {
        std::string json = R"({"service":"cpp-service","version":"1.0.0","status":"operational","calculations_performed":0})";
        return "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + 
               std::to_string(json.length()) + "\r\n\r\n" + json;
    }

    void run() {
        while (true) {
            struct sockaddr_in client_address;
            socklen_t addr_len = sizeof(client_address);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_address, &addr_len);
            
            if (client_fd < 0) {
                continue;
            }
            
            char buffer[4096] = {0};
            recv(client_fd, buffer, 4096, 0);
            
            std::string request(buffer);
            std::string method, path, body;
            
            // Parse request
            size_t space1 = request.find(' ');
            size_t space2 = request.find(' ', space1 + 1);
            if (space1 != std::string::npos && space2 != std::string::npos) {
                method = request.substr(0, space1);
                path = request.substr(space1 + 1, space2 - space1 - 1);
                
                // Remove query string if present
                size_t query_pos = path.find('?');
                if (query_pos != std::string::npos) {
                    path = path.substr(0, query_pos);
                }
            }
            
            // Extract body if POST
            size_t body_start = request.find("\r\n\r\n");
            if (body_start != std::string::npos && method == "POST") {
                body = request.substr(body_start + 4);
            }
            
            std::string response = handleRequest(method, path, body);
            send(client_fd, response.c_str(), response.length(), 0);
            
#ifdef _WIN32
            closesocket(client_fd);
#else
            close(client_fd);
#endif
        }
    }

    ~SimpleHTTPServer() {
        if (server_fd >= 0) {
#ifdef _WIN32
            closesocket(server_fd);
            WSACleanup();
#else
            close(server_fd);
#endif
        }
    }
};

int main() {
    const char* port_str = std::getenv("PORT");
    int port = port_str ? std::stoi(port_str) : 8083;
    
    SimpleHTTPServer server(port);
    if (!server.start()) {
        return 1;
    }
    
    server.run();
    return 0;
}

