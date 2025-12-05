require('dotenv/config');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.DB_PASS || process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'sisproyect';
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

async function createPool() {
  return mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
    timezone: 'Z',
    dateStrings: true,
    charset: 'utf8mb4',
  });
}

async function main() {
  const pool = await createPool();
  await initTables(pool);
  const app = express();

  app.use(cors({ origin: ORIGIN }));
  app.use(express.json());

  app.get('/api/departments', async (_req, res) => {
    const [rows] = await pool.query('SELECT id, name, color FROM departments');
    res.json(rows);
  });

  app.get('/api/projects', async (_req, res) => {
    const [rows] = await pool.query(
      'SELECT id, name, description, start, end FROM projects',
    );
    res.json(rows);
  });

  app.get('/api/tasks', async (_req, res) => {
    const [rows] = await pool.query(
      'SELECT id, projectId, departmentId, title, status, priority, due, effort FROM tasks',
    );
    res.json(rows);
  });

  app.get('/api/users', async (_req, res) => {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, active, created_at AS createdAt FROM users ORDER BY created_at DESC',
    );
    res.json(rows);
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { username, email, password, role, active } = req.body ?? {};
      if (!username || !password || !role) {
        return res.status(400).json({ message: 'username, password y role son requeridos' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO users (id, username, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?)',
        [id, username, email || `${username}@local`, hashed, role, active === 0 ? 0 : 1],
      );
      res.status(201).json({ id, username, email: email || '', role, active: active === 0 ? 0 : 1 });
    } catch (err) {
      console.error('Error creating user', err);
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'El usuario o correo ya existe' });
      }
      res.status(500).json({ message: 'Error creando usuario' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, password, role, active } = req.body ?? {};
      const fields = [];
      const params = [];
      if (username) { fields.push('username = ?'); params.push(username); }
      if (email) { fields.push('email = ?'); params.push(email); }
      if (role) { fields.push('role = ?'); params.push(role); }
      if (active === 0 || active === 1) { fields.push('active = ?'); params.push(active); }
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        fields.push('password_hash = ?');
        params.push(hashed);
      }
      if (!fields.length) {
        return res.status(400).json({ message: 'No hay campos para actualizar' });
      }
      params.push(id);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
      res.json({ id, username, email, role, active });
    } catch (err) {
      console.error('Error updating user', err);
      res.status(500).json({ message: 'Error actualizando usuario' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      res.json({ id });
    } catch (err) {
      console.error('Error deleting user', err);
      res.status(500).json({ message: 'Error eliminando usuario' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return res.status(400).json({ message: 'username y password son requeridos' });
      }
      const [rows] = await pool.query(
        'SELECT id, username, email, role, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, username],
      );
      if (!rows.length) {
        return res.status(401).json({ message: 'Credenciales invalidas' });
      }
      const user = rows[0];
      if (!user.active) {
        return res.status(401).json({ message: 'Usuario inactivo' });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Credenciales invalidas' });
      }
      res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error('Error en login', err);
      res.status(500).json({ message: 'Error en login' });
    }
  });

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

async function initTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Intentar agregar username si la tabla existe sin la columna
  try {
    await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL UNIQUE AFTER id');
  } catch (err) {
    // ignorar si ya existe
  }
}
