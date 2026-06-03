import {
  type GuildMember,
  PermissionFlagsBits,
  type PermissionResolvable,
} from "discord.js";

export function hasPermission(
  member: GuildMember,
  permission: PermissionResolvable,
): boolean {
  return member.permissions.has(permission);
}

export function isModerator(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

export function canModerate(
  moderator: GuildMember,
  target: GuildMember,
): boolean {
  if (target.id === target.guild.ownerId) return false;
  if (!moderator.roles.highest) return false;
  return moderator.roles.highest.comparePositionTo(target.roles.highest) > 0;
}
