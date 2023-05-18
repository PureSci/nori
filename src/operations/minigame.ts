import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { getServerConfig } from "../utils/databaseHandler.js";
import { fetchFormat } from "../utils/index.js";
export function filter(message: Message): boolean {
    return message.embeds?.[0]?.title?.includes("MINIGAME") ? true : false;
}

export async function run(message: Message) {
    let config = await getServerConfig("serverDrops.minigame", message.guildId);
    if (!config.enabled.data) return;
    let found = await bridge.findCards([
        {
            name: message.embeds[0].description?.split("**")[1].split("**")[0]!,
            series: message.embeds[0].description?.split("*(")[1].split(")*")[0]!,
        }
    ]);
    let format = fetchFormat(config.format.data, found);
    message.reply(format).catch(_ => null);
}