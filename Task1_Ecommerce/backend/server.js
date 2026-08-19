const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mysecretkey123'; // just for practice/dev purposes

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mysqlwei_wei123',
  database: 'codealpha_ecommerce'
}); 

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.get('/', (req, res) => {
  res.send('E-commerce API is running');
});

app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});
 
app.get('/api/products/:id', (req, res) => {
  db.query('SELECT * FROM products WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results[0]);
  });
});

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: 'User registered successfully', userId: result.insertId });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, name: user.name, userId: user.id });
  });
});

app.post('/api/orders', (req, res) => {
  const { userId, items, total } = req.body;

  db.query(
    'INSERT INTO orders (user_id, total) VALUES (?, ?)',
    [userId, total],
    (err, orderResult) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const orderId = orderResult.insertId;

      const itemValues = items.map((item) => [orderId, item.id, item.quantity, item.price]);

      db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
        [itemValues],
        (err2) => {
          if (err2) {
            res.status(500).json({ error: err2.message });
            return;
          }
          res.json({ message: 'Order placed successfully', orderId });
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});