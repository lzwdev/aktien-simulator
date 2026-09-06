import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Leaderboard from './components/Leaderboard';
import Login from './components/Login';
import Register from './components/Register';
import StockDetail from './components/StockDetail';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AuthContext = createContext();

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [stocks, setStocks] = useState([]);
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stocks`);
      setStocks(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Aktien:', error);
    }
  };

  const login = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    navigate('/');
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, username, api, login, logout }}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  📈 AktienSim
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                {token ? (
                  <>
                    <span className="text-gray-700">Willkommen, {username}!</span>
                    <Link to="/portfolio" className="text-gray-700 hover:text-blue-600">
                      Portfolio
                    </Link>
                    <Link to="/leaderboard" className="text-gray-700 hover:text-blue-600">
                      Bestenliste
                    </Link>
                    <button onClick={logout} className="btn-secondary text-sm">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-gray-700 hover:text-blue-600">
                      Login
                    </Link>
                    <Link to="/register" className="btn-primary text-sm">
                      Registrieren
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard stocks={stocks} />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/stock/:id" element={<StockDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
