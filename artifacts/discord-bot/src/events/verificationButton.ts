import {
  type Client,
  type ButtonInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { verificationRequests } from "../lib/schema.js";
import { getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { successEmbed, errorEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";

export async function handleVerifyButton(
  interaction: ButtonInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const config = await getConfig(interaction.guild.id);
  if (!config?.verificationRoleId) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Not Configured",
          "Verification role has not been configured. Please ask an admin to run `/setup verification`.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);
  if (!member) return;

  if (member.roles.cache.has(config.verificationRoleId)) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.success)
          .setTitle("✅ Already Verified")
          .setDescription("You are already verified in this server!"),
      ],
      ephemeral: true,
    });
    return;
  }

  try {
    await member.roles.add(
      config.verificationRoleId,
      "User self-verified via verification button",
    );

    await db.insert(verificationRequests).values({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      status: "approved",
      reviewedBy: _client.user?.id ?? "bot",
    });

    await interaction.reply({
      embeds: [
        successEmbed(
          "Verification Successful",
          `Welcome to **${interaction.guild.name}**! You now have access to all channels.`,
        ),
      ],
      ephemeral: true,
    });

    logger.info(`Verified ${interaction.user.tag} in guild ${interaction.guild.id}`);

    if (config.logChannelId) {
      const logChannel = await interaction.guild.channels
        .fetch(config.logChannelId)
        .catch(() => null);
      if (logChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(Colors.verification)
          .setTitle("🔐 User Verified")
          .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
          .addFields(
            {
              name: "👤 User",
              value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
              inline: true,
            },
            {
              name: "🎭 Role Granted",
              value: `<@&${config.verificationRoleId}>`,
              inline: true,
            },
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    logger.error("Verification failed", err);
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Verification Failed",
          "Could not assign your role. Please contact an admin.",
        ),
      ],
      ephemeral: true,
    });
  }
}
