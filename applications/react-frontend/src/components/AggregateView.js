import React, { useState } from 'react';
import axios from 'axios';

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
    <div className="bg-white rounded-xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">API Gateway</h2>
        <p className="text-gray-600 text-sm">Aggregated view of all microservices</p>
      </div>

      <div className="mb-6">
        <button 
          onClick={fetchAggregated} 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Aggregating...' : 'Aggregate Services'}
        </button>
      </div>

      {aggregated && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Aggregated Response</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {JSON.stringify(aggregated, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AggregateView;

