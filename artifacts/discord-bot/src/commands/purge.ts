import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  type TextChannel,
} from "discord.js";
import { successEmbed, errorEmbed } from "../lib/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk delete messages")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((o) =>
    o
      .setName("amount")
      .setDescription("Number of messages to delete (1-100)")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true),
  )
  .addUserOption((o) =>
    o
      .setName("user")
      .setDescription("Only delete messages from this user")
      .setRequired(false),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild || !interaction.channel) return;

  const amount = interaction.options.getInteger("amount", true);
  const filterUser = interaction.options.getUser("user");

  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = interaction.channel as TextChannel;
    const messages = await channel.messages.fetch({ limit: 100 });

    let toDelete = [...messages.values()].filter((m) => {
      const age = Date.now() - m.createdTimestamp;
      return age < 1_209_600_000; // 14 days
    });

    if (filterUser) {
      toDelete = toDelete.filter((m) => m.author.id === filterUser.id);
    }

    toDelete = toDelete.slice(0, amount);

    if (toDelete.length === 0) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "No Messages",
            "No eligible messages found (must be under 14 days old).",
          ),
        ],
      });
      return;
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply({
      embeds: [
        successEmbed(
          "Messages Purged",
          `Deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser.tag}` : ""}.`,
        ),
      ],
    });
  } catch (err) {
    await interaction.editReply({
      embeds: [errorEmbed("Purge Failed", String(err))],
    });
  }
}
