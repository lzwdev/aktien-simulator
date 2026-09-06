import React from 'react';
import { Link } from 'react-router-dom';
import StockList from './StockList';

function Dashboard({ stocks }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Aktienmarkt</h1>
      <StockList stocks={stocks} />
    </div>
  );
}

export default Dashboard;
