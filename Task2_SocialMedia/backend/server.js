const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mysecretkey123';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mysqlwei_wei123',
  database: 'codealpha_social'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.get('/', (req, res) => {
  res.send('Social Media API is running');
});

// ---------- AUTH ----------

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User registered successfully', userId: result.insertId });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, name: user.name, userId: user.id });
  });
});

// ---------- POSTS ----------

app.get('/api/posts', (req, res) => {
  const sql = `
    SELECT posts.id, posts.content, posts.created_at, users.id AS user_id, users.name,
    (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;
  db.query(
    'INSERT INTO posts (user_id, content) VALUES (?, ?)',
    [userId, content],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Post created', postId: result.insertId });
    }
  );
});

// ---------- LIKES ----------

app.post('/api/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const postId = req.params.id;
  db.query(
    'INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)',
    [postId, userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Post liked' });
    }
  );
});

app.delete('/api/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const postId = req.params.id;
  db.query(
    'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
    [postId, userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Post unliked' });
    }
  );
});

// ---------- COMMENTS ----------

app.get('/api/posts/:id/comments', (req, res) => {
  const sql = `
    SELECT comments.id, comments.content, comments.created_at, users.name
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.post_id = ?
    ORDER BY comments.created_at ASC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { userId, content } = req.body;
  db.query(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [req.params.id, userId, content],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Comment added', commentId: result.insertId });
    }
  );
});

// ---------- FOLLOW ----------

app.post('/api/users/:id/follow', (req, res) => {
  const { followerId } = req.body;
  const followingId = req.params.id;
  db.query(
    'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
    [followerId, followingId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Followed user' });
    }
  );
});

app.get('/api/users/:id/followers', (req, res) => {
  db.query(
    'SELECT COUNT(*) AS followers FROM follows WHERE following_id = ?',
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
});

// ---------- USERS ----------

app.get('/api/users', (req, res) => {
  db.query('SELECT id, name, bio FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/users/:id/stats', (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS post_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following
  `;
  db.query(sql, [userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 