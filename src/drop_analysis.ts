import { Message } from "discord.js";
import bridge from "./utils/bridge.js";
import { get_user_config } from "./utils/database_handler.js";
import reminder_handler from "./utils/reminder_handler.js";
export function filter(message: Message): boolean {
    return message.content.endsWith("is dropping the cards") || message.content == "Your extra drop is being used.";
}

interface CardData {
    name: string,
    series: string,
    wl: string,
    gen: string
}

export async function run(message: Message, url?: string) {
    if (!message.guildId) return;
    let dropper = message.content?.split("<@")?.[1]?.split(">")?.[0]
    let analysis_config = await get_user_config("analysis", dropper, message.guildId);
    if (!analysis_config.enabled.data) return;
    if (message.attachments.size > 0 || url) {
        url = url ? url : message.attachments.first()?.url;
        if (!url) return;
        let card_data: CardData[] = JSON.parse(await bridge.ocr_drop(url));
        handle_message(message, card_data, analysis_config, dropper);
    } else {
        let card_data: Partial<CardData>[] = [];
        for (let i = 0; i < 3; i++) {
            let name_series = message.embeds[0].fields[i].value.split("\n\n").map(x => x.replace("```", "").replace("\n", "").trim());
            name_series = name_series.map(x => x.endsWith("-") ? x.substring(0, x.length - 1).concat("...") : x);
            card_data.push({
                name: name_series[0],
                series: name_series[1],
                gen: message.embeds[0].fields[i].name.split("Gen")[1].trim()
            });
        }
        let character_data: CardData[] = JSON.parse(await bridge.find_cards(JSON.stringify(card_data)));
        handle_message(message, character_data, analysis_config, dropper);
    }
    let reminder_config = await get_user_config("reminders.drop", dropper, message.guildId);
    if (reminder_config.data && !message.content.includes("Your extra drop is being used.")) reminder_handler(message, dropper, "drop");
}

function handle_message(message: Message, ocr_output: CardData[], analysis_config: any, dropper: string) {
    let format: string = analysis_config.format.data;
    let rows = format.split("\n");
    if (rows.length !== 1) {
        if (rows.some(x => x.startsWith("{copy"))) {
            let first_row = rows[0];
            rows.shift();
            format = first_row;
            rows.forEach(row => {
                let search_and_replace_value = row.split("{copy")[1].split("}")[0].split("?");
                format += "\n" + first_row.replaceAll(search_and_replace_value[0], search_and_replace_value[1]);
            });
        }
    }
    ocr_output.forEach((card, index) => {
        format = format.replaceAll(`{wl${index + 1}}`, set_spacing(card.wl, 4))
            .replaceAll(`{gen${index + 1}}`, set_spacing(card.gen, 4))
            .replaceAll(`{cardname${index + 1}}`, capitalize_first(card.name))
            .replaceAll(`{cardseries${index + 1}}`, capitalize_first(card.series));
    });
    message.fetchReference().then(drop_message => {
        drop_message.reply(format);
    }).catch(_ => {
        message.reply(format + `\n<@${dropper}>`);
    });
}

function set_spacing(text: string | number, spacing: number) {
    if (typeof text == "number") text = text.toString();
    let for_length = spacing - text.length;
    for (let i = 0; i < for_length; i++) {
        text += " ";
    }
    return text;
}

function capitalize_first(text: string) {
    let capitalized: string[] = [];
    text.split(" ").forEach(part => {
        capitalized.push(part.charAt(0).toUpperCase() + part.slice(1));
    });
    return capitalized.join(" ");
}