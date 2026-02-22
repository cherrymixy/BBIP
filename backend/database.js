const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bbip.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        time TEXT,
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '🐔',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// 기본 사용자 생성 (없으면)
const existingUser = db.prepare('SELECT * FROM users LIMIT 1').get();
if (!existingUser) {
    db.prepare('INSERT INTO users (id, name, emoji) VALUES (?, ?, ?)').run(
        'default-user',
        '전승아',
        '🐔'
    );
}

module.exports = db;
