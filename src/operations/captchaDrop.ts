import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { getServerConfig } from "../utils/databaseHandler.js";
import { fetchFormat } from "../utils/index.js";
import { Character } from "../../rust-workers/rust-workers.js";
export function filter(message: Message): boolean {
    return message.embeds?.[0]?.title === "Captcha Drop";
}

export async function run(message: Message) {
    if (!message.guildId) return;

    let config = await getServerConfig("serverDrops.captcha", message.guildId);
    if (!config.enabled.data) return;
    let url = message.embeds?.[0]?.image?.url;
    if (!url) return;

    let ocrOutput: Character[] = await bridge.ocrCaptcha(url);

    let format = fetchFormat(config.format.data, ocrOutput);

    message.reply(format).catch(_ => null);
}