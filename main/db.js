const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app ? app.getPath('userData') : __dirname, 'database.sqlite');
const db = new Database(dbPath);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS routine_bells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      days TEXT DEFAULT '[]',
      audio_path TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prayer_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      location_name TEXT DEFAULT 'Pondok Pesantren Nurul Jadid, Paiton, Probolinggo',
      latitude REAL DEFAULT -7.710508,
      longitude REAL DEFAULT 113.496974,
      elevation REAL DEFAULT 10,
      timezone REAL DEFAULT 7.0,
      offset_subuh INTEGER DEFAULT 0,
      offset_dzuhur INTEGER DEFAULT 0,
      offset_ashar INTEGER DEFAULT 0,
      offset_maghrib INTEGER DEFAULT 0,
      offset_isya INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prayer_bells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer_name TEXT NOT NULL,
      title TEXT,
      offset_minutes INTEGER DEFAULT 0,
      audio_path TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bell_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM prayer_settings').get();
  if (count.c === 0) {
    db.prepare('INSERT INTO prayer_settings (id, location_name, latitude, longitude, elevation) VALUES (1, ?, ?, ?, ?)').run(
      'Pondok Pesantren Nurul Jadid, Paiton, Probolinggo',
      -7.710508,
      113.496974,
      10
    );
  } else {
    // Pastikan kolom baru tersedia pada database lama
    try { db.exec(`ALTER TABLE prayer_settings ADD COLUMN location_name TEXT DEFAULT 'Pondok Pesantren Nurul Jadid, Paiton, Probolinggo'`); } catch (e) {}
    try { db.exec(`ALTER TABLE prayer_settings ADD COLUMN elevation REAL DEFAULT 10`); } catch (e) {}
    // Sinkronkan ke koordinat presisi Google Maps Nurul Jadid Paiton (-7.710508, 113.496974)
    db.prepare(`
      UPDATE prayer_settings
      SET latitude = -7.710508, longitude = 113.496974, location_name = 'Pondok Pesantren Nurul Jadid, Paiton, Probolinggo', elevation = 10
      WHERE id = 1 AND (ABS(latitude - (-7.979)) < 0.1 OR ABS(latitude - (-7.71105)) < 0.01 OR ABS(latitude - (-7.7126)) < 0.01 OR ABS(latitude - (-7.75)) < 0.01)
    `).run();
  }
}

initDatabase();

module.exports = db;