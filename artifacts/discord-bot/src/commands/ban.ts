import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { db } from "../lib/db.js";
import { modLogs } from "../lib/schema.js";
import { Colors } from "../lib/colors.js";
import {
  modActionEmbed,
  successEmbed,
  errorEmbed,
} from "../lib/embeds.js";
import { canModerate } from "../lib/permissions.js";
import { getConfig } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a member from the server")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to ban").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("Reason for the ban").setRequired(false),
  )
  .addIntegerOption((o) =>
    o
      .setName("delete_days")
      .setDescription("Days of messages to delete (0-7)")
      .setMinValue(0)
      .setMaxValue(7)
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild || !interaction.member) return;

  const target = interaction.options.getUser("user", true);
  const reason =
    interaction.options.getString("reason") ?? "No reason provided";
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

  const moderator = await interaction.guild.members.fetch(interaction.user.id);
  let targetMember = null;
  try {
    targetMember = await interaction.guild.members.fetch(target.id);
  } catch {
    // user not in guild
  }

  if (targetMember && !canModerate(moderator, targetMember)) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Cannot Ban",
          "You cannot ban this user — they have equal or higher roles.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (target.id === interaction.client.user?.id) {
    await interaction.reply({
      embeds: [errorEmbed("Cannot Ban", "I cannot ban myself.")],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await interaction.guild.bans.create(target.id, {
      reason: `[${interaction.user.tag}] ${reason}`,
      deleteMessageSeconds: deleteDays * 86400,
    });

    await db.insert(modLogs).values({
      guildId: interaction.guild.id,
      action: "ban",
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = modActionEmbed({
      action: "Member Banned",
      icon: "🔨",
      target,
      moderator: interaction.user,
      reason,
      color: Colors.ban,
    });

    await interaction.editReply({ embeds: [embed] });

    const config = await getConfig(interaction.guild.id);
    if (config?.logChannelId) {
      const logChannel = await interaction.guild.channels
        .fetch(config.logChannelId)
        .catch(() => null);
      if (logChannel?.isTextBased()) {
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    await interaction.editReply({
      embeds: [
        errorEmbed("Ban Failed", `Could not ban the user: ${String(err)}`),
      ],
    });
  }
}
