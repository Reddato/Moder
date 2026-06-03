import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { modLogs } from "../lib/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { Colors } from "../lib/colors.js";

const ACTION_ICONS: Record<string, string> = {
  ban: "🔨",
  unban: "✅",
  kick: "👢",
  mute: "🔇",
  unmute: "🔊",
  warn: "⚠️",
};

export const data = new SlashCommandBuilder()
  .setName("modlogs")
  .setDescription("View moderation history for a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to look up").setRequired(true),
  )
  .addIntegerOption((o) =>
    o
      .setName("limit")
      .setDescription("Number of entries (default 10, max 25)")
      .setMinValue(1)
      .setMaxValue(25)
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const limit = interaction.options.getInteger("limit") ?? 10;

  const logs = await db
    .select()
    .from(modLogs)
    .where(
      and(
        eq(modLogs.guildId, interaction.guild.id),
        eq(modLogs.targetId, target.id),
      ),
    )
    .orderBy(desc(modLogs.createdAt))
    .limit(limit);

  const embed = new EmbedBuilder()
    .setColor(Colors.logging)
    .setTitle(`📋 Mod Logs — ${target.tag}`)
    .setThumbnail(target.displayAvatarURL({ size: 64 }))
    .setDescription(logs.length === 0 ? "No moderation history found." : null)
    .setFooter({ text: `Showing ${logs.length} most recent entries` })
    .setTimestamp();

  for (const entry of logs) {
    const icon = ACTION_ICONS[entry.action] ?? "📌";
    embed.addFields({
      name: `${icon} ${entry.action.toUpperCase()} — <t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`,
      value: [
        `**By:** <@${entry.moderatorId}>`,
        entry.reason ? `**Reason:** ${entry.reason}` : null,
        entry.duration ? `**Duration:** ${entry.duration}s` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
