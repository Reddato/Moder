import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { db } from "../lib/db.js";
import { warnings, modLogs } from "../lib/schema.js";
import { eq, and } from "drizzle-orm";
import { Colors } from "../lib/colors.js";
import { modActionEmbed, errorEmbed } from "../lib/embeds.js";
import { getConfig } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn a member")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to warn").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("Reason for the warning").setRequired(true),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);

  if (target.bot) {
    await interaction.reply({
      embeds: [errorEmbed("Cannot Warn", "You cannot warn a bot.")],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const config = await getConfig(interaction.guild.id);
  const maxWarnings = config?.maxWarnings ?? 3;

  await db.insert(warnings).values({
    guildId: interaction.guild.id,
    userId: target.id,
    moderatorId: interaction.user.id,
    reason,
  });

  await db.insert(modLogs).values({
    guildId: interaction.guild.id,
    action: "warn",
    targetId: target.id,
    moderatorId: interaction.user.id,
    reason,
  });

  const allWarnings = await db
    .select()
    .from(warnings)
    .where(
      and(
        eq(warnings.guildId, interaction.guild.id),
        eq(warnings.userId, target.id),
      ),
    );

  const count = allWarnings.length;

  const embed = modActionEmbed({
    action: "Member Warned",
    icon: "⚠️",
    target,
    moderator: interaction.user,
    reason,
    color: Colors.warn,
    extras: [
      {
        name: "📊 Warning Count",
        value: `${count} / ${maxWarnings}`,
        inline: true,
      },
    ],
  });

  await interaction.editReply({ embeds: [embed] });

  if (config?.logChannelId) {
    const logChannel = await interaction.guild.channels
      .fetch(config.logChannelId)
      .catch(() => null);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  }

  // Auto-action on max warnings
  if (count >= maxWarnings) {
    try {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) {
        await member.timeout(
          3600000,
          `Auto-mute: reached ${maxWarnings} warnings`,
        );
        if (config?.logChannelId) {
          const logChannel = await interaction.guild.channels
            .fetch(config.logChannelId)
            .catch(() => null);
          if (logChannel?.isTextBased()) {
            const autoEmbed = modActionEmbed({
              action: "Auto-Mute: Max Warnings Reached",
              icon: "🤖",
              target,
              moderator: interaction.client.user!,
              reason: `Accumulated ${maxWarnings} warnings`,
              duration: 3600,
              color: Colors.ban,
            });
            await logChannel.send({ embeds: [autoEmbed] });
          }
        }
      }
    } catch {
      // best-effort
    }
  }
}
