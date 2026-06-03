import { db } from "./db.js";
import { guildConfig } from "./schema.js";
import { eq } from "drizzle-orm";
import type { GuildConfig } from "./schema.js";

const cache = new Map<string, GuildConfig>();

export async function getConfig(guildId: string): Promise<GuildConfig | null> {
  if (cache.has(guildId)) return cache.get(guildId)!;
  const [config] = await db
    .select()
    .from(guildConfig)
    .where(eq(guildConfig.guildId, guildId));
  if (config) cache.set(guildId, config);
  return config ?? null;
}

export async function upsertConfig(
  guildId: string,
  values: Partial<Omit<GuildConfig, "id" | "guildId">>,
): Promise<GuildConfig> {
  const [result] = await db
    .insert(guildConfig)
    .values({ guildId, updatedAt: new Date(), ...values })
    .onConflictDoUpdate({
      target: guildConfig.guildId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  cache.set(guildId, result);
  return result;
}

export function invalidateConfig(guildId: string) {
  cache.delete(guildId);
}
