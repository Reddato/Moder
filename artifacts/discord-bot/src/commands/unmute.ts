import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { db } from "../lib/db.js";
import { modLogs } from "../lib/schema.js";
import { Colors } from "../lib/colors.js";
import { modActionEmbed, errorEmbed } from "../lib/embeds.js";
import { getConfig } from "../lib/config.js";

export const data = new SlashCommandBuilder()
  .setName("unmute")
  .setDescription("Remove timeout from a member")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to unmute").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("Reason").setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const target = interaction.options.getMember("user");
  const reason =
    interaction.options.getString("reason") ?? "No reason provided";

  if (!target || !("id" in target)) {
    await interaction.reply({
      embeds: [errorEmbed("Not Found", "That user is not in this server.")],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await target.timeout(null, `[${interaction.user.tag}] ${reason}`);

    await db.insert(modLogs).values({
      guildId: interaction.guild.id,
      action: "unmute",
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = modActionEmbed({
      action: "Member Unmuted",
      icon: "🔊",
      target: target.user,
      moderator: interaction.user,
      reason,
      color: Colors.unmute,
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
      embeds: [errorEmbed("Unmute Failed", String(err))],
    });
  }
}
