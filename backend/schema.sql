-- Part A: one table only (SQLite)
-- Types from the brief map as: INT AUTO_INCREMENT -> INTEGER PRIMARY KEY AUTOINCREMENT,
-- VARCHAR(n) -> TEXT (length enforced in the API), TIMESTAMP -> DATETIME.
CREATE TABLE IF NOT EXISTS clubs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL CHECK (length(name) <= 120),
  category       TEXT,
  description    TEXT,
  meeting_day    TEXT,
  venue          TEXT,
  president_name TEXT,
  contact_email  TEXT,
  member_count   INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SQLite has no "ON UPDATE CURRENT_TIMESTAMP", so a trigger keeps updated_at fresh.
CREATE TRIGGER IF NOT EXISTS trg_clubs_updated_at
AFTER UPDATE ON clubs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE clubs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
