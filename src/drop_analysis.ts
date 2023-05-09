import { Message } from "discord.js";
import bridge from "./utils/bridge.js";
import { get_user_config } from "./utils/database_handler.js";
import reminder_handler from "./utils/reminder_handler.js";
import { fetch_format } from "./utils/index.js";
export function filter(message: Message): boolean {
    return message.content.endsWith("is dropping the cards") || message.content == "Your extra drop is being used.";
}

export interface CardData {
    name: string,
    series: string,
    wl: string,
    gen: string
}

export async function run(message: Message, url?: string) {
    if (!message.guildId) return;

    let dropper = message.content?.split("<@")?.[1]?.split(">")?.[0];
    let analysis_config = await get_user_config("analysis", dropper, message.guildId);

    if (!analysis_config.enabled.data) return;

    let card_data: CardData[] = [];

    if (message.attachments.size > 0 || url) {
        url = url || message.attachments.first()?.url;
        if (!url) return;
        card_data = JSON.parse(await bridge.ocr_drop(url));
    } else {
        let partial_card_data: Partial<CardData>[] = [];
        for (let i = 0; i < 3; i++) {
            let name_series = message.embeds[0].fields[i].value.split("\n\n").map(x => x.replace("```", "").replace("\n", "").trim());
            name_series = name_series.map(x => x.endsWith("-") ? x.substring(0, x.length - 1).concat("...") : x);

            partial_card_data.push({
                name: name_series[0],
                series: name_series[1],
                gen: message.embeds[0].fields[i].name.split("Gen")[1].trim()
            });
        }
        card_data = JSON.parse(await bridge.find_cards(JSON.stringify(partial_card_data)));
    }

    handle_message(message, card_data, analysis_config, dropper);

    let reminder_config = await get_user_config("reminders.drop", dropper, message.guildId);
    if (reminder_config.data && !message.content.includes("Your extra drop is being used.")) {
        reminder_handler(message, dropper, "drop");
    }
}


function handle_message(message: Message, ocr_output: CardData[], analysis_config: any, dropper: string) {
    let format: string = analysis_config.format.data;
    format = fetch_format(format, ocr_output);
    message.fetchReference().then(drop_message => {
        drop_message.reply(format);
    }).catch(_ => {
        message.reply(format + `\n<@${dropper}>`).catch(_ => null);
    });
}