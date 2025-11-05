import React, { useState } from 'react';
import ServiceCard from './components/ServiceCard';
import AggregateView from './components/AggregateView';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8082';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <header className="bg-white/10 backdrop-blur-lg shadow-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            SRE/DevOps Portfolio Project
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            Microservices Architecture Demonstration
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex justify-between items-center animate-pulse">
            <p className="font-semibold">Error: {error}</p>
            <button 
              onClick={() => setError(null)}
              className="bg-white text-red-500 px-4 py-2 rounded font-semibold hover:bg-red-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
          </div>
        )}
      </main>

      <footer className="bg-black/20 backdrop-blur-sm text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm mb-1">Built with React, Express, Go, and Python</p>
          <p className="text-xs text-white/80">
            Infrastructure: Azure AKS, Terraform, ArgoCD, Prometheus, Grafana, Jaeger
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

