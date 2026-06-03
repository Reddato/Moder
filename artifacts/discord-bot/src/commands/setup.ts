import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { upsertConfig, getConfig } from "../lib/config.js";
import { Colors } from "../lib/colors.js";
import { successEmbed, errorEmbed, verificationEmbed } from "../lib/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure the bot for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("logs")
      .setDescription("Set the moderation log channel")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel for mod logs")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("verification")
      .setDescription("Set up verification system")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel for verification")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addRoleOption((o) =>
        o
          .setName("role")
          .setDescription("Role to assign after verification")
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("welcome")
      .setDescription("Set the welcome message channel")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel for welcome messages")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("maxwarnings")
      .setDescription("Set max warnings before auto-action")
      .addIntegerOption((o) =>
        o
          .setName("count")
          .setDescription("Number of warnings (1-10)")
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("View current bot configuration"),
  );

export async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!interaction.guild) return;

  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });

  if (sub === "logs") {
    const channel = interaction.options.getChannel("channel", true);
    await upsertConfig(interaction.guild.id, { logChannelId: channel.id });
    await interaction.editReply({
      embeds: [
        successEmbed(
          "Log Channel Set",
          `Moderation logs will be sent to <#${channel.id}>.`,
        ),
      ],
    });
  } else if (sub === "verification") {
    const channel = interaction.options.getChannel("channel", true);
    const role = interaction.options.getRole("role", true);

    await upsertConfig(interaction.guild.id, {
      verificationChannelId: channel.id,
      verificationRoleId: role.id,
    });

    const verChannel = await interaction.guild.channels
      .fetch(channel.id)
      .catch(() => null);

    if (verChannel?.isTextBased()) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_button")
          .setLabel("✅ Verify Me")
          .setStyle(ButtonStyle.Success),
      );
      await verChannel.send({
        embeds: [verificationEmbed(interaction.guild.name)],
        components: [row],
      });
    }

    await interaction.editReply({
      embeds: [
        successEmbed(
          "Verification Set Up",
          `Verification panel sent to <#${channel.id}>. Members will receive <@&${role.id}> on verification.`,
        ),
      ],
    });
  } else if (sub === "welcome") {
    const channel = interaction.options.getChannel("channel", true);
    await upsertConfig(interaction.guild.id, { welcomeChannelId: channel.id });
    await interaction.editReply({
      embeds: [
        successEmbed(
          "Welcome Channel Set",
          `Welcome messages will be sent to <#${channel.id}>.`,
        ),
      ],
    });
  } else if (sub === "maxwarnings") {
    const count = interaction.options.getInteger("count", true);
    await upsertConfig(interaction.guild.id, { maxWarnings: count });
    await interaction.editReply({
      embeds: [
        successEmbed(
          "Max Warnings Updated",
          `Members will be auto-muted after **${count}** warnings.`,
        ),
      ],
    });
  } else if (sub === "status") {
    const config = await getConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor(Colors.primary)
      .setTitle("⚙️ Bot Configuration")
      .addFields(
        {
          name: "📋 Log Channel",
          value: config?.logChannelId ? `<#${config.logChannelId}>` : "Not set",
          inline: true,
        },
        {
          name: "🔐 Verification Channel",
          value: config?.verificationChannelId
            ? `<#${config.verificationChannelId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "🎭 Verification Role",
          value: config?.verificationRoleId
            ? `<@&${config.verificationRoleId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "👋 Welcome Channel",
          value: config?.welcomeChannelId
            ? `<#${config.welcomeChannelId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "⚠️ Max Warnings",
          value: `${config?.maxWarnings ?? 3}`,
          inline: true,
        },
        {
          name: "🤖 Auto-Mod",
          value: config?.autoModEnabled !== false ? "Enabled" : "Disabled",
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
