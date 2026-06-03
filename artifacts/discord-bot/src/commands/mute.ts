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
import { canModerate } from "../lib/permissions.js";
import { getConfig } from "../lib/config.js";

function parseDuration(raw: string): number | null {
  const match = raw.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return n * (multipliers[unit.toLowerCase()] ?? 0);
}

export const data = new SlashCommandBuilder()
  .setName("mute")
  .setDescription("Timeout (mute) a member")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to mute").setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName("duration")
      .setDescription("Duration (e.g. 10m, 1h, 7d — max 28d)")
      .setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName("reason")
      .setDescription("Reason for the mute")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const target = interaction.options.getMember("user");
  const durationStr = interaction.options.getString("duration", true);
  const reason =
    interaction.options.getString("reason") ?? "No reason provided";

  if (!target || !("id" in target)) {
    await interaction.reply({
      embeds: [errorEmbed("Not Found", "That user is not in this server.")],
      ephemeral: true,
    });
    return;
  }

  const durationSec = parseDuration(durationStr);
  if (!durationSec || durationSec > 2419200) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Invalid Duration",
          "Use format like `10m`, `2h`, `7d`. Maximum is 28 days.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const moderator = await interaction.guild.members.fetch(interaction.user.id);
  if (!canModerate(moderator, target)) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Cannot Mute",
          "You cannot mute this user — they have equal or higher roles.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await target.timeout(
      durationSec * 1000,
      `[${interaction.user.tag}] ${reason}`,
    );

    await db.insert(modLogs).values({
      guildId: interaction.guild.id,
      action: "mute",
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
      duration: durationSec,
    });

    const embed = modActionEmbed({
      action: "Member Muted",
      icon: "🔇",
      target: target.user,
      moderator: interaction.user,
      reason,
      duration: durationSec,
      color: Colors.mute,
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
      embeds: [errorEmbed("Mute Failed", String(err))],
    });
  }
}
