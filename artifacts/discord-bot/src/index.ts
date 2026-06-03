import {
  Client,
  GatewayIntentBits,
  Partials,
  type Interaction,
  type Message,
  type GuildMember,
  type PartialGuildMember,
  type PartialMessage,
} from "discord.js";
import { logger } from "./lib/logger.js";
import { pool } from "./lib/db.js";
import { handleVerifyButton } from "./events/verificationButton.js";
import * as readyEvent from "./events/ready.js";
import * as guildMemberAddEvent from "./events/guildMemberAdd.js";
import * as guildMemberRemoveEvent from "./events/guildMemberRemove.js";
import * as messageDeleteEvent from "./events/messageDelete.js";
import * as messageUpdateEvent from "./events/messageUpdate.js";
import * as autoModEvent from "./events/autoMod.js";

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
] as const;

type CommandModule = {
  data: { name: string };
  execute: (interaction: any, client: Client) => Promise<void>;
};

const commands = new Map<string, CommandModule>();
for (const mod of commandModules) {
  commands.set(mod.data.name, mod as CommandModule);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
  ],
});

// Ready
client.once("clientReady", () => readyEvent.execute(client));

// Interactions (commands + buttons)
client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }
    try {
      await command.execute(interaction, client);
    } catch (err) {
      logger.error(`Error in /${interaction.commandName}`, err);
      const payload = {
        content: "❌ Something went wrong executing that command.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "verify_button") {
      await handleVerifyButton(interaction, client);
    }
  }
});

// Member events
client.on(guildMemberAddEvent.name, (member: GuildMember) =>
  guildMemberAddEvent.execute(member, client),
);

client.on(
  guildMemberRemoveEvent.name,
  (member: GuildMember | PartialGuildMember) =>
    guildMemberRemoveEvent.execute(member, client),
);

// Message events
client.on(
  messageDeleteEvent.name,
  (message: Message | PartialMessage) =>
    messageDeleteEvent.execute(message, client),
);

client.on(
  messageUpdateEvent.name,
  (oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) =>
    messageUpdateEvent.execute(oldMsg, newMsg, client),
);

client.on(autoModEvent.name, (message: Message) =>
  autoModEvent.execute(message, client),
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down...");
  client.destroy();
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down...");
  client.destroy();
  await pool.end();
  process.exit(0);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection", err);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  logger.error("DISCORD_BOT_TOKEN is not set");
  process.exit(1);
}

logger.info("Starting Discord bot...");
client.login(token).catch((err) => {
  logger.error("Failed to login", err);
  process.exit(1);
});
