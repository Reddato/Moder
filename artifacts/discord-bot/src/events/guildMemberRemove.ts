import {
  type Client,
  type GuildMember,
  type PartialGuildMember,
  EmbedBuilder,
} from "discord.js";
import { getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { logger } from "../lib/logger.js";

export const name = "guildMemberRemove";
export const once = false;

export async function execute(
  member: GuildMember | PartialGuildMember,
  _client: Client,
) {
  const config = await getConfig(member.guild.id);
  if (!config?.logChannelId) return;

  const channel = await member.guild.channels
    .fetch(config.logChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;

  const user = member.user;
  if (!user) return;

  const embed = new EmbedBuilder()
    .setColor(Colors.error)
    .setTitle("📤 Member Left")
    .setThumbnail(user.displayAvatarURL({ size: 64 }))
    .addFields(
      {
        name: "👤 User",
        value: `${user.tag} (<@${user.id}>)\n\`${user.id}\``,
        inline: true,
      },
      {
        name: "📅 Joined",
        value: member.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
          : "Unknown",
        inline: true,
      },
      {
        name: "👥 Members Now",
        value: `${member.guild.memberCount}`,
        inline: true,
      },
    )
    .setTimestamp()
    .setFooter({ text: `ID: ${user.id}` });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error("Failed to send member remove log", err);
  }
}
