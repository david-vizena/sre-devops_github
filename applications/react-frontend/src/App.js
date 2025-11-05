import React, { useState } from 'react';
import './App.css';
import ServiceCard from './components/ServiceCard';
import AggregateView from './components/AggregateView';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8082';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="App">
      <header className="App-header">
        <h1>SRE/DevOps Portfolio Project</h1>
        <p className="subtitle">Microservices Architecture Demonstration</p>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-banner">
            <p>Error: {error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="services-container">
          <ServiceCard
            title="Go Microservice"
            description="High-performance business logic service"
            baseUrl={API_BASE_URL}
            servicePath="/api/v1/go"
            onError={setError}
            onLoading={setLoading}
          />

          <ServiceCard
            title="Python Microservice"
            description="Data processing and transformation service"
            baseUrl={API_BASE_URL}
            servicePath="/api/v1/python"
            onError={setError}
            onLoading={setLoading}
          />

          <AggregateView
            baseUrl={API_BASE_URL}
            onError={setError}
            onLoading={setLoading}
          />
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Built with React, Express, Go, and Python</p>
        <p>Infrastructure: Azure AKS, Terraform, ArgoCD, Prometheus, Grafana, Jaeger</p>
      </footer>
    </div>
  );
}

export default App;

