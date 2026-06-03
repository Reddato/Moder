import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { modLogs } from "../lib/schema.js";
import { Colors } from "../lib/colors.js";
import { errorEmbed } from "../lib/embeds.js";
import { getConfig } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a user from the server")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addStringOption((o) =>
    o
      .setName("user_id")
      .setDescription("The user ID to unban")
      .setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("Reason").setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const userId = interaction.options.getString("user_id", true).trim();
  const reason =
    interaction.options.getString("reason") ?? "No reason provided";

  await interaction.deferReply({ ephemeral: true });

  try {
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      await interaction.editReply({
        embeds: [errorEmbed("Not Banned", "That user is not banned.")],
      });
      return;
    }

    await interaction.guild.bans.remove(
      userId,
      `[${interaction.user.tag}] ${reason}`,
    );

    await db.insert(modLogs).values({
      guildId: interaction.guild.id,
      action: "unban",
      targetId: userId,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.unban)
      .setTitle("✅ User Unbanned")
      .addFields(
        {
          name: "👤 User",
          value: `<@${userId}> \`${userId}\``,
          inline: true,
        },
        {
          name: "🛡️ Moderator",
          value: `${interaction.user.tag}`,
          inline: true,
        },
        { name: "📋 Reason", value: reason },
      )
      .setTimestamp();

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
        errorEmbed("Unban Failed", `Could not unban the user: ${String(err)}`),
      ],
    });
  }
}
