import {
  type Client,
  type Message,
  type PartialMessage,
  EmbedBuilder,
} from "discord.js";
import { getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { logger } from "../lib/logger.js";

export const name = "messageUpdate";
export const once = false;

export async function execute(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
  _client: Client,
) {
  if (!newMessage.guild) return;
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const config = await getConfig(newMessage.guild.id);
  if (!config?.logChannelId) return;

  const channel = await newMessage.guild.channels
    .fetch(config.logChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(Colors.warning)
    .setTitle("✏️ Message Edited")
    .setURL(newMessage.url)
    .addFields(
      {
        name: "👤 Author",
        value: newMessage.author
          ? `${newMessage.author.tag} (<@${newMessage.author.id}>)`
          : "Unknown",
        inline: true,
      },
      {
        name: "📍 Channel",
        value: `<#${newMessage.channelId}>`,
        inline: true,
      },
      {
        name: "📝 Before",
        value: (oldMessage.content || "*Unknown*").slice(0, 1024),
      },
      {
        name: "📝 After",
        value: (newMessage.content || "*Empty*").slice(0, 1024),
      },
    )
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error("Failed to send message update log", err);
  }
}
