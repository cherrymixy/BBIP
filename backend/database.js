const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bbip.db');
const db = new Database(dbPath);

// 테이블 생성
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        emoji TEXT DEFAULT '🐔',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        time TEXT,
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);

// 기존 테이블 마이그레이션: user_id 컬럼이 없으면 추가
try {
    db.prepare("SELECT user_id FROM plans LIMIT 1").get();
} catch (e) {
    db.exec("ALTER TABLE plans ADD COLUMN user_id TEXT DEFAULT 'default-user'");
}

// 기존 users 테이블에 email, password 컬럼이 없으면 추가
try {
    db.prepare("SELECT email FROM users LIMIT 1").get();
} catch (e) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
    db.exec("ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''");
}

module.exports = db;
