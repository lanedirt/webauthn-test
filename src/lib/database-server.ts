import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = path.join(process.cwd(), 'data', 'webauthn.db');

// Ensure data directory exists
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS passkeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    device_type TEXT,
    backed_up BOOLEAN DEFAULT FALSE,
    transports TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS webauthn_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    challenge TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );
`);

// Prepared statements
export const dbQueries = {
  // User queries
  createUser: db.prepare(`
    INSERT INTO users (username, password_hash)
    VALUES (?, ?)
  `),

  getUserByUsername: db.prepare(`
    SELECT * FROM users WHERE username = ?
  `),

  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  // Passkey queries
  createPasskey: db.prepare(`
    INSERT INTO passkeys (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getPasskeysByUserId: db.prepare(`
    SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC
  `),

  getPasskeyByCredentialId: db.prepare(`
    SELECT p.*, u.username FROM passkeys p
    JOIN users u ON p.user_id = u.id
    WHERE p.credential_id = ?
  `),

  updatePasskeyCounter: db.prepare(`
    UPDATE passkeys
    SET counter = ?, last_used_at = CURRENT_TIMESTAMP
    WHERE credential_id = ?
  `),

  deletePasskey: db.prepare(`
    DELETE FROM passkeys WHERE id = ? AND user_id = ?
  `),

  // Session queries
  createSession: db.prepare(`
    INSERT INTO webauthn_sessions (id, user_id, challenge, expires_at)
    VALUES (?, ?, ?, ?)
  `),

  getSession: db.prepare(`
    SELECT s.*, u.username FROM webauthn_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `),

  deleteSession: db.prepare(`
    DELETE FROM webauthn_sessions WHERE id = ?
  `),

  cleanupExpiredSessions: db.prepare(`
    DELETE FROM webauthn_sessions WHERE expires_at <= CURRENT_TIMESTAMP
  `)
};

// Types
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Passkey {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: boolean;
  transports: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface Session {
  id: string;
  user_id: number;
  challenge: string;
  created_at: string;
  expires_at: string;
  username?: string;
}

// Utility functions
export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 12);
};

export const verifyPassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};

export const generateSessionId = (): string => {
  return crypto.randomUUID();
};

export const generateChallenge = (): string => {
  return crypto.randomUUID();
};

// Cleanup expired sessions on startup
dbQueries.cleanupExpiredSessions.run();

export default db;
