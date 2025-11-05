import React, { useState } from 'react';
import axios from 'axios';
import './ServiceCard.css';

function ServiceCard({ title, description, baseUrl, servicePath, onError, onLoading }) {
  const [healthStatus, setHealthStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [processing, setProcessing] = useState(false);

  const checkHealth = async () => {
    onLoading(true);
    try {
      const response = await axios.get(`${baseUrl}${servicePath}/health`);
      setHealthStatus(response.data);
      onError(null);
    } catch (error) {
      setHealthStatus({ status: 'unhealthy', error: error.message });
      onError(`Failed to check ${title} health: ${error.message}`);
    } finally {
      onLoading(false);
    }
  };

  const getStats = async () => {
    onLoading(true);
    try {
      const endpoint = title.includes('Go') 
        ? `${baseUrl}${servicePath}/api/v1/stats`
        : `${baseUrl}${servicePath}/api/v1/metrics`;
      
      const response = await axios.get(endpoint);
      setStats(response.data);
      onError(null);
    } catch (error) {
      onError(`Failed to get ${title} stats: ${error.message}`);
    } finally {
      onLoading(false);
    }
  };

  const processData = async () => {
    setProcessing(true);
    onLoading(true);
    try {
      const endpoint = title.includes('Go')
        ? `${baseUrl}${servicePath}/api/v1/process`
        : `${baseUrl}${servicePath}/api/v1/transform`;
      
      const method = title.includes('Go') ? 'post' : 'post';
      const response = await axios[method](endpoint, { test: 'data' });
      
      setStats(response.data);
      onError(null);
    } catch (error) {
      onError(`Failed to process with ${title}: ${error.message}`);
    } finally {
      setProcessing(false);
      onLoading(false);
    }
  };

  return (
    <div className="service-card">
      <div className="card-header">
        <h2>{title}</h2>
        <p className="card-description">{description}</p>
      </div>

      <div className="card-actions">
        <button onClick={checkHealth} className="btn btn-primary">
          Check Health
        </button>
        <button onClick={getStats} className="btn btn-secondary">
          Get Stats
        </button>
        <button 
          onClick={processData} 
          className="btn btn-action"
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Process Data'}
        </button>
      </div>

      {healthStatus && (
        <div className="card-result">
          <h3>Health Status</h3>
          <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
        </div>
      )}

      {stats && (
        <div className="card-result">
          <h3>Service Data</h3>
          <pre>{JSON.stringify(stats, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default ServiceCard;

