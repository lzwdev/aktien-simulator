import React from 'react';
import { Link } from 'react-router-dom';

function StockList({ stocks }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preis
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Änderung
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Volumen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stocks.map((stock) => (
              <tr key={stock.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/stock/${stock.id}`} className="text-blue-600 font-medium">
                    {stock.symbol}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {stock.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                  ${stock.price.toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right ${
                  stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                  {stock.volume.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockList;
