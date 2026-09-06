import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../App';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function StockDetail() {
  const { id } = useParams();
  const { api, token } = useContext(AuthContext);
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchStock = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stocks/${id}`);
      setStock(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Aktie:', error);
    }
  };

  const handleBuy = async () => {
    if (!token) {
      setError('Bitte zuerst einloggen');
      return;
    }
    
    try {
      await api.post('/api/buy', { stockId: id, quantity });
      alert('Kauf erfolgreich!');
      fetchStock();
    } catch (error) {
      setError(error.response?.data?.error || 'Fehler beim Kauf');
    }
  };

  if (!stock) {
    return <div className="text-center py-12">Lädt...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{stock.symbol}</h1>
            <p className="text-lg text-gray-600">{stock.name}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">${stock.price.toFixed(2)}</p>
            <p className={`text-lg ${
              stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Volumen</p>
              <p className="text-lg font-medium">{stock.volume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Letzte Aktualisierung</p>
              <p className="text-lg font-medium">
                {new Date(stock.updated_at).toLocaleTimeString('de-DE')}
              </p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {token && (
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anzahl
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field"
                min="1"
              />
            </div>
            <button onClick={handleBuy} className="btn-primary flex-1">
              Kaufen für ${(stock.price * quantity).toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockDetail;
