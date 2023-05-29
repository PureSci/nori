import { Character, Series } from "../../rust-workers/rust-workers";

export function setSpacing(text: string | number | undefined, spacing: number, isSeriesOne: boolean = false) {
    if (text == undefined) {
        if (isSeriesOne) text = "0";
        else text = "?";
    }
    if (typeof text == "number") text = text.toString();
    let forLength = spacing - text.length;
    for (let i = 0; i < forLength; i++) {
        text += " ";
    }
    return text;
}

export function capitalizeFirst(text: string | (null | undefined)) {
    if (!text) return "";
    let capitalized: string[] = [];
    text.split(" ").forEach(part => {
        capitalized.push(part.charAt(0).toUpperCase() + part.slice(1));
    });
    return capitalized.join(" ");
}

export function fetchFormat(format: string, ocrOutput: (Character | Series)[], isSeriesOne: boolean = false) {
    let rows = format.split("\n");
    if (rows.length !== 1) {
        /*
        rows: [
            '`god drop when`'
            '`1]` • :mouse2: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}'
            '{copy1?2}'
            '{copy1?3}'
        ]
        */
        if (rows.some(x => x.startsWith("{copy"))) {
            let firstRow = rows[0];
            rows.shift();
            format = firstRow;
            rows.forEach(row => {
                if (!row.startsWith("{copy")) {
                    format += `\n${row}`;
                } else {
                    let searchAndReplaceValue = row.split("{copy")[1].split("}")[0].split("?");
                    format += "\n" + firstRow.replaceAll(searchAndReplaceValue[0], searchAndReplaceValue[1]);
                }
            });
        }
    }
    ocrOutput.forEach((card, index) => {
        format = format.replaceAll(`{cardseries${index + 1}}`, capitalizeFirst(card.series))
            .replaceAll(`{wl${index + 1}}`, setSpacing(card.wl, 4, isSeriesOne));
        if ("name" in card) {
            format = format.replaceAll(`{cardname${index + 1}}`, capitalizeFirst(card.name))
                .replaceAll(`{gen${index + 1}}`, setSpacing(card.gen, 4));
        }
    });
    return format;
}