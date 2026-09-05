const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Datenbank initialisieren
const db = new Database('aktien.db');

// Tabellen erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    change_percent REAL DEFAULT 0,
    volume INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    avg_price REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE(user_id, stock_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id)
  );

  CREATE TABLE IF NOT EXISTS users_balance (
    user_id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 10000,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed Stocks
const seedStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.25 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 380.75 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 145.80 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.30 },
  { symbol: 'META', name: 'Meta Platforms', price: 485.60 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.25 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.40 },
  { symbol: 'V', name: 'Visa Inc.', price: 275.90 },
  { symbol: 'WMT', name: 'Walmart Inc.', price: 62.35 }
];

const insertStock = db.prepare('INSERT OR IGNORE INTO stocks (symbol, name, price) VALUES (?, ?, ?)');
seedStocks.forEach(stock => insertStock.run(stock.symbol, stock.name, stock.price));

// Middleware für Authentifizierung
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Kein Token' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'geheim', (err, user) => {
    if (err) return res.status(403).json({ error: 'Ungültiger Token' });
    req.user = user;
    next();
  });
};

// API Routes

// Registrierung
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    db.prepare('INSERT INTO users_balance (user_id, balance) VALUES (?, 10000)').run(result.lastInsertRowid);
    
    res.json({ message: 'Registrierung erfolgreich' });
  } catch (error) {
    res.status(400).json({ error: 'Username existiert bereits' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) return res.status(400).json({ error: 'User nicht gefunden' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Falsches Passwort' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'geheim');
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Server Fehler' });
  }
});

// Aktienkurse abrufen
app.get('/api/stocks', (req, res) => {
  const stocks = db.prepare('SELECT * FROM stocks').all();
  res.json(stocks);
});

// Einzelne Aktie
app.get('/api/stocks/:id', (req, res) => {
  const stock = db.prepare('SELECT * FROM stocks WHERE id = ?').get(req.params.id);
  if (!stock) return res.status(404).json({ error: 'Aktie nicht gefunden' });
  res.json(stock);
});

// Balance abrufen
app.get('/api/balance', authenticateToken, (req, res) => {
  const balance = db.prepare('SELECT balance FROM users_balance WHERE user_id = ?').get(req.user.id);
  res.json(balance);
});

// Portfolio abrufen
app.get('/api/portfolio', authenticateToken, (req, res) => {
  const portfolio = db.prepare(`
    SELECT p.*, s.symbol, s.name, s.price, s.change_percent
    FROM portfolios p
    JOIN stocks s ON p.stock_id = s.id
    WHERE p.user_id = ?
  `).all(req.user.id);
  
  res.json(portfolio);
});

// Aktie kaufen
app.post('/api/buy', authenticateToken, (req, res) => {
  const { stockId, quantity } = req.body;
  
  try {
    const stock = db.prepare('SELECT * FROM stocks WHERE id = ?').get(stockId);
    const balance = db.prepare('SELECT balance FROM users_balance WHERE user_id = ?').get(req.user.id);
    
    const totalCost = stock.price * quantity;
    if (balance.balance < totalCost) {
      return res.status(400).json({ error: 'Nicht genug Guthaben' });
    }
    
    db.transaction(() => {
      // Balance aktualisieren
      db.prepare('UPDATE users_balance SET balance = balance - ? WHERE user_id = ?').run(totalCost, req.user.id);
      
      // Portfolio aktualisieren
      const existing = db.prepare('SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?').get(req.user.id, stockId);
      
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const newAvgPrice = ((existing.avg_price * existing.quantity) + totalCost) / newQuantity;
        db.prepare('UPDATE portfolios SET quantity = ?, avg_price = ? WHERE user_id = ? AND stock_id = ?').run(newQuantity, newAvgPrice, req.user.id, stockId);
      } else {
        db.prepare('INSERT INTO portfolios (user_id, stock_id, quantity, avg_price) VALUES (?, ?, ?, ?)').run(req.user.id, stockId, quantity, stock.price);
      }
      
      // Transaktion aufzeichnen
      db.prepare('INSERT INTO transactions (user_id, stock_id, type, quantity, price, total_amount) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, stockId, 'BUY', quantity, stock.price, totalCost);
    })();
    
    res.json({ message: 'Kauf erfolgreich' });
  } catch (error) {
    res.status(500).json({ error: 'Kauf fehlgeschlagen' });
  }
});

// Aktie verkaufen
app.post('/api/sell', authenticateToken, (req, res) => {
  const { stockId, quantity } = req.body;
  
  try {
    const stock = db.prepare('SELECT * FROM stocks WHERE id = ?').get(stockId);
    const portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ? AND stock_id = ?').get(req.user.id, stockId);
    
    if (!portfolio || portfolio.quantity < quantity) {
      return res.status(400).json({ error: 'Nicht genug Aktien' });
    }
    
    const totalRevenue = stock.price * quantity;
    
    db.transaction(() => {
      // Balance aktualisieren
      db.prepare('UPDATE users_balance SET balance = balance + ? WHERE user_id = ?').run(totalRevenue, req.user.id);
      
      // Portfolio aktualisieren
      const newQuantity = portfolio.quantity - quantity;
      if (newQuantity === 0) {
        db.prepare('DELETE FROM portfolios WHERE user_id = ? AND stock_id = ?').run(req.user.id, stockId);
      } else {
        db.prepare('UPDATE portfolios SET quantity = ? WHERE user_id = ? AND stock_id = ?').run(newQuantity, req.user.id, stockId);
      }
      
      // Transaktion aufzeichnen
      db.prepare('INSERT INTO transactions (user_id, stock_id, type, quantity, price, total_amount) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, stockId, 'SELL', quantity, stock.price, totalRevenue);
    })();
    
    res.json({ message: 'Verkauf erfolgreich' });
  } catch (error) {
    res.status(500).json({ error: 'Verkauf fehlgeschlagen' });
  }
});

// Bestenliste
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT u.username, 
           ub.balance + COALESCE(SUM(p.quantity * s.price), 0) as total_value
    FROM users u
    JOIN users_balance ub ON u.id = ub.user_id
    LEFT JOIN portfolios p ON u.id = p.user_id
    LEFT JOIN stocks s ON p.stock_id = s.id
    GROUP BY u.id
    ORDER BY total_value DESC
    LIMIT 100
  `).all();
  
  res.json(leaderboard);
});

// Simulierte Aktienkurse aktualisieren
setInterval(() => {
  const stocks = db.prepare('SELECT * FROM stocks').all();
  
  const updateStock = db.prepare('UPDATE stocks SET price = ?, change_percent = ?, volume = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  
  stocks.forEach(stock => {
    const change = (Math.random() - 0.48) * 0.02; // -0.96% bis +1.04%
    const newPrice = Math.max(1, stock.price * (1 + change));
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    updateStock.run(newPrice, change * 100, volume, stock.id);
  });
}, 5000); // Update alle 5 Sekunden

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
