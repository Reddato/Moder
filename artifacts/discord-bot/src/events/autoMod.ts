import { type Client, type Message } from "discord.js";
import { getConfig } from "../lib/config.js";
import { autoModNotice, autoModLogEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";

const SPAM_THRESHOLD = 5;
const SPAM_WINDOW_MS = 5000;
const userMessageMap = new Map<string, number[]>();

const BANNED_PATTERNS = [
  /discord\.gg\/[a-z0-9]+/i,
  /discordapp\.com\/invite\/[a-z0-9]+/i,
  /@everyone/,
  /@here/,
];

const CAPS_THRESHOLD = 0.7;
const MIN_CAPS_LENGTH = 10;

export const name = "messageCreate";
export const once = false;

async function sendNotice(message: Message, reason: string) {
  try {
    const notice = await message.channel.send({
      embeds: [autoModNotice(message.author.id, reason)],
    });
    setTimeout(() => notice.delete().catch(() => null), 6000);
  } catch {
    // best-effort
  }
}

async function logAction(
  message: Message,
  reason: string,
  logChannelId: string | null | undefined,
) {
  if (!logChannelId || !message.guild) return;
  const ch = await message.guild.channels.fetch(logChannelId).catch(() => null);
  if (!ch?.isTextBased()) return;
  await ch
    .send({
      embeds: [
        autoModLogEmbed({
          userId: message.author.id,
          userTag: message.author.tag,
          channelId: message.channelId,
          reason,
          content: message.content,
        }),
      ],
    })
    .catch(() => null);
}

export async function execute(message: Message, _client: Client) {
  if (!message.guild || message.author.bot || !message.member) return;

  const config = await getConfig(message.guild.id);
  if (!config?.autoModEnabled) return;
  if (message.member.permissions.has("ManageMessages")) return;

  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;

  const timestamps = (userMessageMap.get(key) ?? []).filter(
    (t) => now - t < SPAM_WINDOW_MS,
  );
  timestamps.push(now);
  userMessageMap.set(key, timestamps);

  if (timestamps.length >= SPAM_THRESHOLD) {
    await message.delete().catch(() => null);
    await sendNotice(message, "Slow down! You're sending messages too quickly.");
    await logAction(message, "Spam Detection", config.logChannelId);
    userMessageMap.set(key, []);
    return;
  }

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(message.content)) {
      await message.delete().catch(() => null);
      await sendNotice(message, "Invite links and mass mentions are not allowed.");
      await logAction(message, "Invite Link / Mass Mention", config.logChannelId);
      return;
    }
  }

  const letters = message.content.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= MIN_CAPS_LENGTH) {
    const ratio = (message.content.match(/[A-Z]/g)?.length ?? 0) / letters.length;
    if (ratio >= CAPS_THRESHOLD) {
      await message.delete().catch(() => null);
      await sendNotice(message, "Please avoid excessive capital letters.");
      await logAction(message, "Excessive Caps", config.logChannelId);
      return;
    }
  }
}
