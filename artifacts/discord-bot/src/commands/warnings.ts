import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { db } from "../lib/db.js";
import { warnings } from "../lib/schema.js";
import { eq, and } from "drizzle-orm";
import { warningListEmbed, successEmbed, errorEmbed } from "../lib/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("View or clear warnings for a user")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all warnings for a user")
      .addUserOption((o) =>
        o.setName("user").setDescription("The user").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear all warnings for a user")
      .addUserOption((o) =>
        o.setName("user").setDescription("The user").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a specific warning by ID")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Warning ID").setRequired(true),
      ),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  if (sub === "list") {
    const target = interaction.options.getUser("user", true);
    const list = await db
      .select()
      .from(warnings)
      .where(
        and(
          eq(warnings.guildId, interaction.guild.id),
          eq(warnings.userId, target.id),
        ),
      );

    const config = await import("../lib/config.js").then((m) =>
      m.getConfig(interaction.guild!.id),
    );
    await interaction.editReply({
      embeds: [warningListEmbed(target, list, config?.maxWarnings ?? 3)],
    });
  } else if (sub === "clear") {
    const target = interaction.options.getUser("user", true);
    const { rowCount } = await db
      .delete(warnings)
      .where(
        and(
          eq(warnings.guildId, interaction.guild.id),
          eq(warnings.userId, target.id),
        ),
      );

    await interaction.editReply({
      embeds: [
        successEmbed(
          "Warnings Cleared",
          `Cleared **${rowCount ?? 0}** warning(s) for ${target.tag}.`,
        ),
      ],
    });
  } else if (sub === "remove") {
    const id = interaction.options.getInteger("id", true);
    const { rowCount } = await db
      .delete(warnings)
      .where(eq(warnings.id, id));

    if (!rowCount) {
      await interaction.editReply({
        embeds: [errorEmbed("Not Found", `No warning with ID **${id}** found.`)],
      });
    } else {
      await interaction.editReply({
        embeds: [
          successEmbed("Warning Removed", `Removed warning #${id}.`),
        ],
      });
    }
  }
}
