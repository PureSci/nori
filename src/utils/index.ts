import { CardData } from "src/drop_analysis";

export function set_spacing(text: string | number, spacing: number) {
    if (typeof text == "number") text = text.toString();
    let for_length = spacing - text.length;
    for (let i = 0; i < for_length; i++) {
        text += " ";
    }
    return text;
}

export function capitalize_first(text: string) {
    let capitalized: string[] = [];
    text.split(" ").forEach(part => {
        capitalized.push(part.charAt(0).toUpperCase() + part.slice(1));
    });
    return capitalized.join(" ");
}

export function fetch_format(format: string, ocr_output: CardData[]) {
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
    return format;
}