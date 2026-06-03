import { type Client, type GuildMember, EmbedBuilder } from "discord.js";
import { getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { logger } from "../lib/logger.js";

export const name = "guildMemberAdd";
export const once = false;

export async function execute(member: GuildMember, _client: Client) {
  const config = await getConfig(member.guild.id);
  if (!config?.welcomeChannelId) return;

  const channel = await member.guild.channels
    .fetch(config.welcomeChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;

  const memberCount = member.guild.memberCount;

  const embed = new EmbedBuilder()
    .setColor(Colors.success)
    .setTitle(`👋 Welcome to ${member.guild.name}!`)
    .setDescription(
      `Hey ${member}, welcome to **${member.guild.name}**!\nYou are member **#${memberCount}**.`,
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      {
        name: "📅 Account Created",
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      {
        name: "🔐 Verification",
        value: config.verificationChannelId
          ? `Head to <#${config.verificationChannelId}> to verify!`
          : "No verification required.",
        inline: false,
      },
    )
    .setTimestamp()
    .setFooter({ text: `ID: ${member.id}` });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error("Failed to send welcome message", err);
  }
}
