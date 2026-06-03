import pg from "pg";
import { logger } from "./lib/logger.js";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SQL = `
CREATE TABLE IF NOT EXISTS bot_warnings (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_mod_logs (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_guild_config (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL UNIQUE,
  log_channel_id TEXT,
  verification_channel_id TEXT,
  verification_role_id TEXT,
  muted_role_id TEXT,
  welcome_channel_id TEXT,
  auto_mod_enabled BOOLEAN DEFAULT TRUE,
  max_warnings INTEGER DEFAULT 3,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_verification_requests (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  reviewed_by TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_temp_bans (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  reason TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON bot_warnings(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_mod_logs_guild_target ON bot_mod_logs(guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_verification_guild_user ON bot_verification_requests(guild_id, user_id);
`;

async function migrate() {
  logger.info("Running database migrations...");
  try {
    await pool.query(SQL);
    logger.info("Migrations complete.");
  } catch (err) {
    logger.error("Migration failed", err);
    throw err;
  } finally {
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
