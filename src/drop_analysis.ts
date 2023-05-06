import { Message } from "discord.js";
import bridge from "./utils/bridge.js";
import merge from "lodash.merge";
import { get_user_config } from "./database/handler.js";
export function filter(message: Message): boolean {
    return message.content.endsWith("is dropping the cards") || message.content == "Your extra drop is being used.";
}

export async function run(message: Message, url?: string) {
    let dropper = message.content?.split("<@")?.[1]?.split(">")?.[0];
    if (message.attachments.size > 0 || url) {
        url = url ? url : message.attachments.first()?.url;
        if (!url) return;
        let ocr = await bridge.ocr_drop(url);
        if (!message.guildId) return;
        console.log(await get_user_config(dropper, message.guildId, "analysis.test"));
    }
}