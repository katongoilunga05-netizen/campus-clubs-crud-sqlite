// Database connection + first-run setup (schema, then sample data if the table is empty).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const file = path.resolve(__dirname, process.env.DB_FILE || './data/campus_clubs.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new Database(file);
db.pragma('journal_mode = WAL');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const { n } = db.prepare('SELECT COUNT(*) AS n FROM clubs').get();
if (n === 0 && process.env.SEED_ON_START !== 'false') {
  db.exec(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
  console.log('Seeded sample clubs.');
}

module.exports = db;
