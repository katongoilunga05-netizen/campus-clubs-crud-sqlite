require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());          // lets the HTML page call the API from any origin
app.use(express.json());  // parses JSON request bodies

// ---------- helpers ----------
const FIELDS = ['name', 'category', 'description', 'meeting_day', 'venue',
                'president_name', 'contact_email', 'member_count'];

const TEXT_LIMITS = { name: 120, category: 60, description: 500, meeting_day: 20,
                      venue: 120, president_name: 120, contact_email: 120 };

// Keep only known fields; trim strings; turn "" into null so optional fields can be cleared.
function pick(body) {
  const out = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    let v = body[f];
    if (typeof v === 'string') { v = v.trim(); if (v === '') v = null; }
    out[f] = v;
  }
  return out;
}

function validate(c) {
  const errors = [];
  if (typeof c.name !== 'string' || !c.name) errors.push('name is required');
  for (const [f, max] of Object.entries(TEXT_LIMITS)) {
    if (c[f] != null && (typeof c[f] !== 'string' || c[f].length > max)) {
      errors.push(`${f} must be text of at most ${max} characters`);
    }
  }
  if (typeof c.contact_email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact_email)) {
    errors.push('contact_email must be a valid email address');
  }
  if (c.member_count != null) {
    const n = Number(c.member_count);
    if (!['number', 'string'].includes(typeof c.member_count) || !Number.isInteger(n) || n < 0) {
      errors.push('member_count must be a whole number, 0 or more');
    }
  }
  return errors;
}

function toParams(c) {
  const p = {};
  for (const f of FIELDS) p[f] = c[f] ?? null;
  p.member_count = c.member_count == null ? 0 : Number(c.member_count);
  return p;
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'id must be a positive whole number' });
    return null;
  }
  return id;
}

// ---------- prepared statements ----------
const listAll   = db.prepare('SELECT * FROM clubs ORDER BY id');
const getOne    = db.prepare('SELECT * FROM clubs WHERE id = ?');
const insertOne = db.prepare(
  `INSERT INTO clubs (${FIELDS.join(', ')}) VALUES (${FIELDS.map(f => '@' + f).join(', ')})`);
const updateOne = db.prepare(
  `UPDATE clubs SET ${FIELDS.map(f => `${f} = @${f}`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
const deleteOne = db.prepare('DELETE FROM clubs WHERE id = ?');

// ---------- API ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// GET /api/clubs -> list all records
app.get('/api/clubs', (req, res) => {
  res.json(listAll.all());
});

// GET /api/clubs/:id -> get one record
app.get('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const club = getOne.get(id);
  if (!club) return res.status(404).json({ error: `Club ${id} not found` });
  res.json(club);
});

// POST /api/clubs -> create a record
app.post('/api/clubs', (req, res) => {
  const club = pick(req.body || {});
  const errors = validate(club);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  const info = insertOne.run(toParams(club));
  res.status(201).json(getOne.get(info.lastInsertRowid));
});

// PUT /api/clubs/:id -> update a record (fields you leave out keep their current value)
app.put('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const existing = getOne.get(id);
  if (!existing) return res.status(404).json({ error: `Club ${id} not found` });

  const merged = { ...existing, ...pick(req.body || {}) };
  const errors = validate(merged);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

  updateOne.run({ ...toParams(merged), id });
  res.json(getOne.get(id));
});

// DELETE /api/clubs/:id -> delete a record
app.delete('/api/clubs/:id', (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const existing = getOne.get(id);
  if (!existing) return res.status(404).json({ error: `Club ${id} not found` });
  deleteOne.run(id);
  res.json({ message: `Club ${id} deleted`, deleted: existing });
});

// Unknown /api routes get JSON, not an HTML error page
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Serve the frontend from the same server (so one URL works in the cloud)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Error handler: always JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Campus Clubs API running on port ${PORT}`));
