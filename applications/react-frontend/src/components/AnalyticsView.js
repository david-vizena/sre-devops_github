import React, { useState } from 'react';
import axios from 'axios';

function AnalyticsView({ baseUrl, onError, onLoading }) {
  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    onLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/v1/analyze`);
      setAnalytics(response.data);
      onError(null);
    } catch (error) {
      onError(`Failed to fetch analytics: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    onLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/v1/report`);
      setReport(response.data);
      onError(null);
    } catch (error) {
      onError(`Failed to fetch report: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics Engine</h2>
      <p className="text-gray-600 text-sm mb-6">Analyze transaction data and generate insights</p>

      <div className="space-y-3 mb-6">
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Transactions'}
        </button>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {analytics && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Total Transactions:</span>
                <span className="ml-2 font-semibold">{analytics.summary?.total_transactions || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Revenue:</span>
                <span className="ml-2 font-semibold text-green-600">${analytics.summary?.total_revenue?.toFixed(2) || '0.00'}</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Order Value:</span>
                <span className="ml-2 font-semibold">${analytics.summary?.average_order_value?.toFixed(2) || '0.00'}</span>
              </div>
              <div>
                <span className="text-gray-600">Median Order:</span>
                <span className="ml-2 font-semibold">${analytics.summary?.median_order_value?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {analytics.category_breakdown && Object.keys(analytics.category_breakdown).length > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Category Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(analytics.category_breakdown).map(([category, data]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{category}:</span>
                    <div className="text-right">
                      <div className="font-semibold">${data.revenue?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{data.items_sold} items</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.discount_analysis && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Discount Analysis</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Transactions with Discount:</span>
                  <span className="ml-2 font-semibold">{analytics.discount_analysis.transactions_with_discount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Discount Rate:</span>
                  <span className="ml-2 font-semibold">{analytics.discount_analysis.discount_rate}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Discount:</span>
                  <span className="ml-2 font-semibold">${analytics.discount_analysis.average_discount?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Discount Value:</span>
                  <span className="ml-2 font-semibold">${analytics.discount_analysis.total_discount_value?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {analytics.time_analysis && analytics.time_analysis.peak_hour !== null && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Time Analysis</h3>
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-gray-600">Peak Hour:</span>
                  <span className="ml-2 font-semibold">{analytics.time_analysis.peak_hour}:00</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {report && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Report</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">Period:</span>
              <div className="text-gray-600 ml-2">
                {new Date(report.period?.start).toLocaleDateString()} - {new Date(report.period?.end).toLocaleDateString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-600">Total Revenue:</span>
                <span className="ml-2 font-semibold text-green-600">${report.key_metrics?.total_revenue?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Avg Order Value:</span>
                <span className="ml-2 font-semibold">${report.key_metrics?.average_order_value?.toFixed(2)}</span>
              </div>
            </div>
            {report.recommendations && report.recommendations.length > 0 && (
              <div>
                <span className="font-semibold">Recommendations:</span>
                <ul className="list-disc list-inside mt-1 text-gray-600">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {(!analytics && !report) && (
        <div className="text-center text-gray-500 text-sm py-8">
          Process some transactions first, then click "Analyze Transactions" to see insights
        </div>
      )}
    </div>
  );
}

export default AnalyticsView;

