import React, { useState } from 'react';
import axios from 'axios';
import './ServiceCard.css';

function AggregateView({ baseUrl, onError, onLoading }) {
  const [aggregated, setAggregated] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAggregated = async () => {
    setLoading(true);
    onLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/v1/aggregate`);
      setAggregated(response.data);
      onError(null);
    } catch (error) {
      onError(`Failed to aggregate services: ${error.message}`);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  return (
    <div className="service-card aggregate-card">
      <div className="card-header">
        <h2>API Gateway</h2>
        <p className="card-description">Aggregated view of all microservices</p>
      </div>

      <div className="card-actions">
        <button 
          onClick={fetchAggregated} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Aggregating...' : 'Aggregate Services'}
        </button>
      </div>

      {aggregated && (
        <div className="card-result">
          <h3>Aggregated Response</h3>
          <pre>{JSON.stringify(aggregated, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default AggregateView;

