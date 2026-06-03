import {
  type Client,
  type Message,
  type PartialMessage,
  EmbedBuilder,
} from "discord.js";
import { getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { logger } from "../lib/logger.js";

export const name = "messageDelete";
export const once = false;

export async function execute(
  message: Message | PartialMessage,
  _client: Client,
) {
  if (!message.guild) return;
  if (message.author?.bot) return;

  const config = await getConfig(message.guild.id);
  if (!config?.logChannelId) return;

  const channel = await message.guild.channels
    .fetch(config.logChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;
  if (
    channel.id === config.logChannelId &&
    message.channelId === config.logChannelId
  )
    return;

  const embed = new EmbedBuilder()
    .setColor(Colors.error)
    .setTitle("🗑️ Message Deleted")
    .addFields(
      {
        name: "👤 Author",
        value: message.author
          ? `${message.author.tag} (<@${message.author.id}>)`
          : "Unknown",
        inline: true,
      },
      {
        name: "📍 Channel",
        value: `<#${message.channelId}>`,
        inline: true,
      },
    )
    .setTimestamp();

  if (message.content) {
    embed.addFields({
      name: "💬 Content",
      value: message.content.slice(0, 1024) || "*Empty*",
    });
  }

  if (message.attachments.size > 0) {
    embed.addFields({
      name: "📎 Attachments",
      value: message.attachments
        .map((a) => a.url)
        .join("\n")
        .slice(0, 1024),
    });
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error("Failed to send message delete log", err);
  }
}
