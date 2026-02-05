require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const config = require('./config');
const db = require('./db/knex');
const errorHandler = require('./middleware/error');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
const sessionMiddleware = session({
  store: new PgSession({ pool: db.client.pool, tableName: 'session', createTableIfMissing: true }),
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: config.session.cookie,
});
app.use(sessionMiddleware);

// ── API Routes ─────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/projects', require('./routes/projects'));
app.use('/api/v1/projects/:id/members', require('./routes/members'));
app.use('/api/v1/projects/:id/tracks', require('./routes/tracks'));
app.use('/api/v1/projects/:id/tracks/:trackId/cues', require('./routes/cues'));
app.use('/api/v1/projects/:id/settings', require('./routes/settings'));
app.use('/api/v1/projects/:id/export', require('./routes/exports'));

// ── Static files ───────────────────────────────────────────
// Serve existing app files from project root for backward compatibility
app.use(express.static(path.join(__dirname, '..', 'client')));
// Serve legacy root-level assets (mlogo2.png, etc.)
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback: return index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Socket.IO ──────────────────────────────────────────────
initSocket(server, sessionMiddleware);

// ── Start ──────────────────────────────────────────────────
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`CueMarkers server running on http://localhost:${PORT}`);
});
