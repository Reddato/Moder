import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const warnings = pgTable("bot_warnings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modLogs = pgTable("bot_mod_logs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const guildConfig = pgTable("bot_guild_config", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  logChannelId: text("log_channel_id"),
  verificationChannelId: text("verification_channel_id"),
  verificationRoleId: text("verification_role_id"),
  mutedRoleId: text("muted_role_id"),
  welcomeChannelId: text("welcome_channel_id"),
  autoModEnabled: boolean("auto_mod_enabled").default(true),
  maxWarnings: integer("max_warnings").default(3),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verificationRequests = pgTable("bot_verification_requests", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").default("pending").notNull(),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tempBans = pgTable("bot_temp_bans", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  reason: text("reason"),
  active: boolean("active").default(true),
});

export type Warning = typeof warnings.$inferSelect;
export type ModLog = typeof modLogs.$inferSelect;
export type GuildConfig = typeof guildConfig.$inferSelect;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type TempBan = typeof tempBans.$inferSelect;
