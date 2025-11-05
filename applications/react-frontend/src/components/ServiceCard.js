import React, { useState } from 'react';
import axios from 'axios';

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
    <div className="bg-white rounded-xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>

      <div className="space-y-3 mb-6">
        <button 
          onClick={checkHealth} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Check Health
        </button>
        <button 
          onClick={getStats} 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Get Stats
        </button>
        <button 
          onClick={processData} 
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Process Data'}
        </button>
      </div>

      {healthStatus && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Health Status</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {JSON.stringify(healthStatus, null, 2)}
          </pre>
        </div>
      )}

      {stats && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Service Data</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ServiceCard;

