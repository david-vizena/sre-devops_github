import React, { useState } from 'react';
import axios from 'axios';

function TransactionProcessor({ baseUrl, onError, onLoading, onTransactionProcessed }) {
  const [transaction, setTransaction] = useState({
    customer_id: '',
    items: [{ id: '1', name: '', price: '', quantity: 1, category: 'electronics' }],
    discount_code: ''
  });
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  const addItem = () => {
    setTransaction({
      ...transaction,
      items: [...transaction.items, { id: Date.now().toString(), name: '', price: '', quantity: 1, category: 'electronics' }]
    });
  };

  const removeItem = (index) => {
    const newItems = transaction.items.filter((_, i) => i !== index);
    setTransaction({ ...transaction, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...transaction.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setTransaction({ ...transaction, items: newItems });
  };

  const processTransaction = async () => {
    setProcessing(true);
    onLoading(true);
    try {
      // Convert items to proper format
      const payload = {
        customer_id: transaction.customer_id || `CUST-${Date.now()}`,
        items: transaction.items.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          category: item.category
        })).filter(item => item.name && item.price > 0),
        discount_code: transaction.discount_code || undefined
      };

      if (payload.items.length === 0) {
        onError('Please add at least one item with a name and price');
        setProcessing(false);
        onLoading(false);
        return;
      }

      const response = await axios.post(`${baseUrl}/api/v1/process-transaction`, payload);
      setResult(response.data);
      onError(null);
      // Notify parent component about the new transaction
      // Go service returns transaction_id in snake_case
      if (onTransactionProcessed && response.data.transaction_id) {
        onTransactionProcessed(response.data.transaction_id);
      }
    } catch (error) {
      onError(`Failed to process transaction: ${error.response?.data?.message || error.message}`);
    } finally {
      setProcessing(false);
      onLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Transaction Processor</h2>
      <p className="text-gray-600 text-sm mb-6">Process transactions with pricing, discounts, and tax calculation</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Customer ID (optional)</label>
          <input
            type="text"
            value={transaction.customer_id}
            onChange={(e) => setTransaction({ ...transaction, customer_id: e.target.value })}
            placeholder="CUST-123"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Items</label>
          {transaction.items.map((item, index) => (
            <div key={item.id} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateItem(index, 'category', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="food">Food</option>
                  <option value="accessories">Accessories</option>
                  <option value="books">Books</option>
                </select>
                {transaction.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={addItem}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
          >
            + Add Item
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Code (optional)</label>
          <input
            type="text"
            value={transaction.discount_code}
            onChange={(e) => setTransaction({ ...transaction, discount_code: e.target.value.toUpperCase() })}
            placeholder="SAVE10, SAVE20, WELCOME, VIP"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Available: SAVE10 (10%), SAVE20 (20%), WELCOME (15%), VIP (25%)</p>
        </div>

        <button
          onClick={processTransaction}
          disabled={processing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Process Transaction'}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction Result</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono font-semibold">{result.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${result.subtotal.toFixed(2)}</span>
              </div>
              {result.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span className="font-semibold">-${result.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8%):</span>
                <span className="font-semibold">${result.tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                <span className="text-lg font-bold text-gray-800">Total:</span>
                <span className="text-lg font-bold text-blue-600">${result.total.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Processed in {result.processing_time_ms}ms
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionProcessor;

