import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { get_server_config } from "../utils/database_handler.js";
import { CardData } from "../drop_analysis.js";
import { fetch_format } from "../utils/index.js";
export function filter(message: Message): boolean {
    return message.embeds?.[0]?.description?.startsWith("**I will drop cards from the most voted series") ? true : false;
}

export async function run(message: Message) {
    if (!message.guildId) return;
    let config = await get_server_config("server_drops.series.one", message.guildId);
    if (!config.enabled.data) return;
    let raw_series = message.embeds[0].description?.split("\n");
    if (!raw_series) return;
    raw_series.shift();
    let series = raw_series.map(s => { return { name: s.split("]")[1].split("**")[0].trim() } });
    let find_output = JSON.parse(await bridge.find_series(JSON.stringify(series)));
    let format = fetch_format(config.format.data, find_output);
    message.reply(format).catch(_ => null);
}
/**
 * I will drop cards from the most voted series :smugsofi:
1] Soul Eater NOT!
2] Cross Game
3] Terra Formars: Revenge
 */