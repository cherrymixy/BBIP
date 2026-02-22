const { createClient } = require('@libsql/client');

let db = null;
let initialized = false;

function getDb() {
    if (!db) {
        // 프로덕션: Turso, 로컬: 로컬 SQLite 파일
        if (process.env.TURSO_DATABASE_URL) {
            db = createClient({
                url: process.env.TURSO_DATABASE_URL,
                authToken: process.env.TURSO_AUTH_TOKEN
            });
        } else {
            // 로컬 개발용 fallback (libsql가 로컬 파일도 지원)
            db = createClient({
                url: 'file:./backend/bbip.db'
            });
        }
    }
    return db;
}

async function initDb() {
    if (initialized) return;
    const client = getDb();

    await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            emoji TEXT DEFAULT '🐔',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.execute(`
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

    initialized = true;
}

module.exports = { getDb, initDb };
