import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { getServerConfig } from "../utils/databaseHandler.js";
import { fetchFormat } from "../utils/index.js";
import { Series } from "../../rust-workers/rust-workers.js";
export function filter(message: Message): boolean {
    return message.embeds?.[0]?.description?.startsWith("**I will drop cards from the most voted series") ? true : false;
}

export async function run(message: Message) {
    let config = await getServerConfig("serverDrops.series.one", message.guildId);
    if (!config.enabled.data) return;
    let rawSeries = message.embeds[0].description?.split("\n");
    if (!rawSeries) return;
    rawSeries.pop();
    rawSeries.shift();
    let series: Series[] = rawSeries.map(s => { return { series: s.split("]")[1].split("**")[0].trim() } });
    let findOutput = await bridge.findSeries(series);
    let format = fetchFormat(config.format.data, findOutput, true);
    message.reply(format).catch(_ => null);
}