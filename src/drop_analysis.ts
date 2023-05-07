import { Message } from "discord.js";
import bridge from "./utils/bridge.js";
import { get_user_config } from "./utils/database_handler.js";
export function filter(message: Message): boolean {
    return message.content.endsWith("is dropping the cards") || message.content == "Your extra drop is being used.";
}

export async function run(message: Message, url?: string) {
    if (!message.guildId) return;
    let dropper = message.content?.split("<@")?.[1]?.split(">")?.[0];
    //let drop_message = await message.fetchReference();
    let analysis_config = get_user_config(dropper, message.guildId, "analysis");
    "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}\n{copy1?3}";
    if (message.attachments.size > 0 || url) {
        url = url ? url : message.attachments.first()?.url;
        if (!url) return;
        let ocr = await bridge.ocr_drop(url);

    }
}