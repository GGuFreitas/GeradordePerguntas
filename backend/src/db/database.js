// node:sqlite é nativo do Node.js v22.12+ — sem dependências externas!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '../../quizforge.db'));

// WAL = melhor desempenho em leituras simultâneas
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    source_text   TEXT,
    status        TEXT    NOT NULL DEFAULT 'pending',
    num_questions INTEGER NOT NULL DEFAULT 5,
    job_id        TEXT,
    is_recovery   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id        INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question       TEXT    NOT NULL,
    options        TEXT    NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation    TEXT    NOT NULL DEFAULT '',
    subject        TEXT    NOT NULL DEFAULT '',
    order_index    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id      INTEGER NOT NULL REFERENCES quizzes(id),
    answers      TEXT    NOT NULL,
    score        INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    percentage   REAL    NOT NULL,
    completed_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
