import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { getServerConfig } from "../utils/databaseHandler.js";
import { fetchFormat } from "../utils/index.js";
import { Character } from "../../rust-workers/rust-workers.js";
export function filter(message: Message): boolean {
    return message.content == "**Series drop**";
}

export async function run(message: Message) {
    let config = await getServerConfig("serverDrops.series.two", message.guildId);
    if (!config.enabled.data) return;
    let url = message.attachments.first()?.url;
    if (!url) return;
    let ocrOutput: Character[] = await bridge.ocrSeries(url);
    console.log(ocrOutput);
    let format = fetchFormat(config.format.data, ocrOutput);

    message.reply(format).catch(_ => null);
}