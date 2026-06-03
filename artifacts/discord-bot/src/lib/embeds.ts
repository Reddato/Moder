import { EmbedBuilder, type GuildMember, type User } from "discord.js";
import { Colors } from "./colors.js";

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

function caseId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function warnBar(count: number, max: number): string {
  const filled = Math.min(count, max);
  const bar = "█".repeat(filled) + "░".repeat(Math.max(0, max - filled));
  return `\`${bar}\` ${count}/${max}`;
}

export function modActionEmbed({
  action,
  icon,
  target,
  moderator,
  reason,
  duration,
  color,
  extras,
}: {
  action: string;
  icon: string;
  target: User | GuildMember;
  moderator: User | GuildMember;
  reason?: string;
  duration?: number;
  color: number;
  extras?: { name: string; value: string; inline?: boolean }[];
}): EmbedBuilder {
  const targetUser = "user" in target ? target.user : (target as User);
  const modUser = "user" in moderator ? moderator.user : (moderator as User);
  const id = caseId();
  const unixNow = Math.floor(Date.now() / 1000);

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `${modUser.username} · Moderator`,
      iconURL: modUser.displayAvatarURL({ size: 64 }),
    })
    .setTitle(`${icon} ${action}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setDescription(
      [
        `> **Target** — ${targetUser.toString()} \`${targetUser.id}\``,
        reason
          ? `> **Reason** — ${reason}`
          : `> **Reason** — *No reason provided*`,
        duration ? `> **Duration** — ${formatDuration(duration)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .addFields(
      {
        name: "🕐 Timestamp",
        value: `<t:${unixNow}:F>`,
        inline: true,
      },
      ...(extras ?? []),
    )
    .setFooter({ text: `Case ${id}  •  User ID: ${targetUser.id}` })
    .setTimestamp();
}

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.success)
    .setAuthor({ name: "Action Successful" })
    .setTitle(`✅  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.error)
    .setAuthor({ name: "Action Failed" })
    .setTitle(`❌  ${title}`)
    .setDescription(`> ${description}`)
    .setTimestamp();
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.info)
    .setTitle(`ℹ️  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function warningListEmbed(
  target: User,
  warnings: {
    id: number;
    reason: string;
    moderatorId: string;
    createdAt: Date;
  }[],
  max: number = 3,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(warnings.length === 0 ? Colors.success : Colors.warn)
    .setAuthor({
      name: `${target.username}'s Warning History`,
      iconURL: target.displayAvatarURL({ size: 64 }),
    })
    .setTitle("⚠️  Warning Record")
    .setThumbnail(target.displayAvatarURL({ size: 128 }))
    .setFooter({ text: `User ID: ${target.id}` })
    .setTimestamp();

  if (warnings.length === 0) {
    embed.setDescription(
      "✅  This user has a clean record — no warnings found.",
    );
    return embed;
  }

  embed.setDescription(`**Severity**  ${warnBar(warnings.length, max)}\n\u200b`);

  for (const w of warnings.slice(0, 25)) {
    const ts = Math.floor(w.createdAt.getTime() / 1000);
    embed.addFields({
      name: `Case #${w.id}`,
      value: [
        `**Reason:** ${w.reason}`,
        `**By:** <@${w.moderatorId}>`,
        `**When:** <t:${ts}:R>`,
      ].join("\n"),
      inline: true,
    });
  }

  return embed;
}

export function verificationEmbed(guildName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.verification)
    .setTitle("🔐  Member Verification")
    .setDescription(
      [
        `Welcome to **${guildName}**!`,
        "",
        "To access the full server, please verify that you are a human by clicking the button below.",
        "",
        "**Before you verify, please read:**",
        "> **1.** Follow all server rules at all times",
        "> **2.** Be respectful to all members",
        "> **3.** No spam, advertising, or harmful content",
        "",
        "*Verification is instant — no waiting required.*",
      ].join("\n"),
    )
    .setFooter({ text: "Click the button below to verify" })
    .setTimestamp();
}

export function logEmbed({
  event,
  description,
  color,
  fields,
  user,
}: {
  event: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  user?: User;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(event)
    .setDescription(description)
    .setTimestamp();

  if (user) embed.setThumbnail(user.displayAvatarURL({ size: 64 }));
  if (fields) embed.addFields(...fields);

  return embed;
}

export function autoModNotice(userId: string, reason: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.error)
    .setTitle("🛡️  Auto-Mod")
    .setDescription(
      `<@${userId}> — **${reason}**\n*This message will be removed shortly.*`,
    )
    .setTimestamp();
}

export function autoModLogEmbed({
  userId,
  userTag,
  channelId,
  reason,
  content,
}: {
  userId: string;
  userTag: string;
  channelId: string;
  reason: string;
  content: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.moderation)
    .setAuthor({ name: "Auto-Mod Triggered" })
    .setTitle("🤖  Automatic Action")
    .addFields(
      {
        name: "👤 User",
        value: `${userTag} (<@${userId}>)\n\`${userId}\``,
        inline: true,
      },
      { name: "📍 Channel", value: `<#${channelId}>`, inline: true },
      { name: "🚫 Trigger", value: reason, inline: true },
      { name: "💬 Content", value: `\`\`\`${content.slice(0, 500)}\`\`\`` },
    )
    .setTimestamp();
}
