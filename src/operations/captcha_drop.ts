import { Message } from "discord.js";
import bridge from "../utils/bridge.js";
import { get_server_config } from "../utils/database_handler.js";
import { CardData } from "../drop_analysis.js";
import { fetch_format } from "../utils/index.js";
export function filter(message: Message): boolean {
    return message.embeds?.[0]?.title === "Captcha Drop";
}

export async function run(message: Message) {
    if (!message.guildId) return;

    let config = await get_server_config("server_drops.captcha", message.guildId);
    if (!config.enabled.data) return;
    let url = message.embeds?.[0]?.image?.url;
    if (!url) return;

    let ocr_output: CardData[] = JSON.parse(await bridge.ocr_captcha(url))

    let format = fetch_format(config.format.data, ocr_output);

    message.reply(format).catch(_ => null);
}