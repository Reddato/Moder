import { type Client, ActivityType } from "discord.js";
import { logger } from "../lib/logger.js";

export const name = "clientReady";
export const once = true;

export async function execute(client: Client) {
  logger.info(`Bot online as ${client.user?.tag}`);

  client.user?.setPresence({
    activities: [
      {
        name: "over the server",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });
}
