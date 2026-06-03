import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { warnings } from "../lib/schema.js";
import { eq, and } from "drizzle-orm";
import { Colors } from "../lib/colors.js";

export const data = new SlashCommandBuilder()
  .setName("userinfo")
  .setDescription("Get information about a user")
  .addUserOption((o) =>
    o.setName("user").setDescription("The user to look up").setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: false });

  const target =
    interaction.options.getUser("user") ?? interaction.user;

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);

  const warnCount = await db
    .select()
    .from(warnings)
    .where(
      and(
        eq(warnings.guildId, interaction.guild.id),
        eq(warnings.userId, target.id),
      ),
    )
    .then((r) => r.length);

  const isBanned = await interaction.guild.bans
    .fetch(target.id)
    .then(() => true)
    .catch(() => false);

  const flags = target.flags?.toArray() ?? [];

  const embed = new EmbedBuilder()
    .setColor(member?.displayColor || Colors.primary)
    .setTitle(`👤 ${target.tag}`)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "🆔 User ID", value: `\`${target.id}\``, inline: true },
      { name: "🤖 Bot", value: target.bot ? "Yes" : "No", inline: true },
      {
        name: "📅 Account Created",
        value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`,
        inline: false,
      },
    )
    .setTimestamp();

  if (member) {
    embed.addFields(
      {
        name: "📥 Joined Server",
        value: member.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
          : "Unknown",
        inline: false,
      },
      {
        name: "🎭 Highest Role",
        value: member.roles.highest.toString(),
        inline: true,
      },
      {
        name: "🔢 Roles",
        value: `${member.roles.cache.size - 1}`,
        inline: true,
      },
    );

    if (member.communicationDisabledUntil) {
      embed.addFields({
        name: "🔇 Muted Until",
        value: `<t:${Math.floor(member.communicationDisabledUntilTimestamp! / 1000)}:R>`,
        inline: true,
      });
    }
  }

  embed.addFields(
    { name: "⚠️ Warnings", value: `${warnCount}`, inline: true },
    { name: "🔨 Banned", value: isBanned ? "Yes" : "No", inline: true },
  );

  if (flags.length > 0) {
    embed.addFields({
      name: "🏅 Badges",
      value: flags.join(", "),
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
