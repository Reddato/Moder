import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
} from "discord.js";
import { Colors } from "../lib/colors.js";

export const data = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Display information about the server");

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  await interaction.deferReply();

  const guild = interaction.guild;
  const owner = await guild.fetchOwner().catch(() => null);

  const totalMembers = guild.memberCount;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;

  const embed = new EmbedBuilder()
    .setColor(Colors.primary)
    .setTitle(`📊 ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .addFields(
      { name: "🆔 Server ID", value: `\`${guild.id}\``, inline: true },
      {
        name: "👑 Owner",
        value: owner ? owner.user.tag : "Unknown",
        inline: true,
      },
      {
        name: "📅 Created",
        value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
        inline: false,
      },
      { name: "👥 Members", value: `${totalMembers}`, inline: true },
      { name: "🤖 Bots", value: `${bots}`, inline: true },
      {
        name: "💬 Channels",
        value: `${guild.channels.cache.size}`,
        inline: true,
      },
      { name: "🎭 Roles", value: `${guild.roles.cache.size}`, inline: true },
      {
        name: "😀 Emojis",
        value: `${guild.emojis.cache.size}`,
        inline: true,
      },
      {
        name: "🚀 Boosts",
        value: `${guild.premiumSubscriptionCount ?? 0} (Tier ${guild.premiumTier})`,
        inline: true,
      },
      {
        name: "🔒 Verification Level",
        value: ["None", "Low", "Medium", "High", "Very High"][
          guild.verificationLevel
        ],
        inline: true,
      },
    )
    .setImage(guild.bannerURL({ size: 1024 }) ?? null)
    .setTimestamp();

  if (guild.description) {
    embed.setDescription(guild.description);
  }

  await interaction.editReply({ embeds: [embed] });
}
