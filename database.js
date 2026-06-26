const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('Conectado com sucesso ao banco de dados SQLite.');
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) console.error('Erro ao habilitar foreign keys:', pragmaErr);
    });
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Tabela de motoristas
    db.run(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        placa TEXT NOT NULL UNIQUE
      )
    `);

    // Tabela de checklists
    db.run(`
      CREATE TABLE IF NOT EXISTS checklists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER UNIQUE,
        veicular INTEGER DEFAULT 0,
        treinamento INTEGER DEFAULT 0,
        briefing INTEGER DEFAULT 0,
        disponibilidade INTEGER DEFAULT 0,
        updated_at TEXT,
        FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
      )
    `, () => {
      // Garante migração automática caso o banco de dados já exista sem a coluna updated_at
      db.run('ALTER TABLE checklists ADD COLUMN updated_at TEXT', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Erro ao adicionar coluna updated_at:', err.message);
        }
      });
    });

    // Tabela de histórico de alterações de checklist
    db.run(`
      CREATE TABLE IF NOT EXISTS checklist_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER,
        campo TEXT NOT NULL,
        antigo INTEGER,
        novo INTEGER,
        timestamp TEXT,
        FOREIGN KEY (driver_id) REFERENCES drivers (id) ON DELETE CASCADE
      )
    `);
  });
}

// Helpers para usar Promises nas queries
const dbQuery = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = { db, dbQuery };
