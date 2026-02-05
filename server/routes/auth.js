const { Router } = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/knex');
const { validateEmail, validatePassword } = require('../utils/validators');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, display_name } = req.body;
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!display_name || !display_name.trim()) return res.status(400).json({ error: 'Display name is required' });

    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({ email: email.toLowerCase(), password_hash, display_name: display_name.trim() })
      .returning(['id', 'email', 'display_name', 'created_at']);

    req.session.userId = user.id;
    res.status(201).json({ user: { id: user.id, email: user.email, display_name: user.display_name } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, display_name: user.display_name } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.session.userId }).select('id', 'email', 'display_name', 'created_at').first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
