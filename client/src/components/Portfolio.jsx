import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

function Portfolio() {
  const { api, token } = useContext(AuthContext);
  const [portfolio, setPortfolio] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (token) {
      fetchPortfolio();
      fetchBalance();
    }
  }, [token]);

  const fetchPortfolio = async () => {
    try {
      const response = await api.get('/api/portfolio');
      setPortfolio(response.data);
      
      const portfolioValue = response.data.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      setTotalValue(portfolioValue);
    } catch (error) {
      console.error('Fehler beim Laden des Portfolios:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await api.get('/api/balance');
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Fehler beim Laden des Guthabens:', error);
    }
  };

  const handleSell = async (stockId, quantity) => {
    try {
      await api.post('/api/sell', { stockId, quantity });
      fetchPortfolio();
      fetchBalance();
      alert('Verkauf erfolgreich!');
    } catch (error) {
      alert(error.response?.data?.error || 'Fehler beim Verkauf');
    }
  };

  if (!token) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 mb-4">Bitte melde dich an, um dein Portfolio zu sehen.</p>
        <Link to="/login" className="btn-primary">Zum Login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mein Portfolio</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-600">Verfügbares Guthaben</h3>
          <p className="text-3xl font-bold text-gray-900">${balance.toFixed(2)}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium text-gray-600">Gesamtwert Portfolio</h3>
          <p className="text-3xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktienbestände</h2>
        
        {portfolio.length === 0 ? (
          <p className="text-gray-500">Keine Aktien im Portfolio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktie</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Anzahl</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kaufpreis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktueller Preis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wert</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {portfolio.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-blue-600">{item.symbol}</span>
                      <span className="ml-2 text-gray-500">{item.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">${item.avg_price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">${item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      ${(item.quantity * item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleSell(item.stock_id, item.quantity)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Verkaufen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio;
