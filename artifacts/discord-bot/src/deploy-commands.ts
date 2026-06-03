import { REST, Routes, OAuth2Scopes, PermissionFlagsBits } from "discord.js";
import { logger } from "./lib/logger.js";

import * as ban from "./commands/ban.js";
import * as kick from "./commands/kick.js";
import * as mute from "./commands/mute.js";
import * as unmute from "./commands/unmute.js";
import * as warn from "./commands/warn.js";
import * as warnings from "./commands/warnings.js";
import * as purge from "./commands/purge.js";
import * as unban from "./commands/unban.js";
import * as userinfo from "./commands/userinfo.js";
import * as serverinfo from "./commands/serverinfo.js";
import * as modlogs from "./commands/modlogs.js";
import * as setup from "./commands/setup.js";

const commandModules = [
  ban, kick, mute, unmute, warn, warnings,
  purge, unban, userinfo, serverinfo, modlogs, setup,
];

const commands = commandModules.map((mod) => mod.data.toJSON());

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  logger.error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required");
  process.exit(1);
}

// Generate invite URL so user can re-invite with correct permissions
const permissions =
  BigInt(PermissionFlagsBits.BanMembers) |
  BigInt(PermissionFlagsBits.KickMembers) |
  BigInt(PermissionFlagsBits.ModerateMembers) |
  BigInt(PermissionFlagsBits.ManageMessages) |
  BigInt(PermissionFlagsBits.ManageRoles) |
  BigInt(PermissionFlagsBits.ViewChannel) |
  BigInt(PermissionFlagsBits.SendMessages) |
  BigInt(PermissionFlagsBits.EmbedLinks) |
  BigInt(PermissionFlagsBits.ReadMessageHistory) |
  BigInt(PermissionFlagsBits.ViewAuditLog);

const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;

const rest = new REST().setToken(token);

async function main() {
  logger.info(`Registering ${commands.length} slash commands...`);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      logger.info(`✅ Registered ${commands.length} guild commands to guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      logger.info(`✅ Registered ${commands.length} global commands`);
    }
  } catch (err: any) {
    if (err?.code === 50001) {
      logger.warn("⚠️  Missing Access — bot needs to be re-invited with the 'applications.commands' scope.");
      logger.warn(`👉 Re-invite URL: ${inviteUrl}`);
      logger.warn("After re-inviting, restart the bot.");
      // Don't crash — let the bot still start (commands may already exist from a prior deploy)
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  logger.error("Failed to deploy commands", err);
  process.exit(1);
});
