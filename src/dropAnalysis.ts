import { Message } from "discord.js";
import bridge from "./utils/bridge.js";
import { getUserConfig } from "./utils/databaseHandler.js";
import reminderHandler from "./utils/reminderHandler.js";
import { fetchFormat } from "./utils/index.js";
import { Character } from "../rust-workers/rust-workers.js";

export let lastAnalysisSpans: number[] = [];
export let averageSpan: number = 0;
export let analysisStartTime = Date.now();
export let analysisCount = 0;

export function filter(message: Message): boolean {
    return message.content.endsWith("is dropping the cards") || message.content.includes("Your extra drop is being used.");
}

export async function run(message: Message, url?: string) {
    const dropper = message.content?.split("<@")?.[1]?.split(">")?.[0];
    const analysisConfig = await getUserConfig("analysis", dropper, message.guildId);

    if (!analysisConfig.enabled.data) return;

    let cardData: Character[];

    if (message.attachments.size > 0 || url) {
        url = url ?? message.attachments.first()?.url;
        if (!url) return;
        cardData = await bridge.ocrDrop(url);
    } else {
        let tempCardData: Character[] = [];
        for (let i = 0; i < 3; i++) {
            let nameSeries = message.embeds[0].fields[i].value.split("\n\n").map(x => x.replace("```", "").replace("\n", "").trim());
            nameSeries = nameSeries.map(x => x.endsWith("-") ? x.substring(0, x.length - 1).concat("...") : x);

            tempCardData.push({
                name: nameSeries[0],
                series: nameSeries[1],
                gen: message.embeds[0].fields[i].name.split("Gen")[1].trim()
            });
        }
        cardData = await bridge.findCards(tempCardData);
    }

    handleMessage(message, cardData, analysisConfig, dropper);

    let reminderConfig = await getUserConfig("reminders.drop", dropper, message.guildId);
    if (reminderConfig.data && !message.content.includes("Your extra drop is being used.")) {
        reminderHandler(message, dropper, "drop");
    }
}

function handleMessage(message: Message, ocrOutput: Character[], analysisConfig: any, dropper: string) {
    let format: string = analysisConfig.format.data;
    format = fetchFormat(format, ocrOutput);
    let processedTime = (Date.now() - message.createdTimestamp);
    averageSpan = (averageSpan + processedTime) / 2;
    pushSpan(processedTime);
    analysisCount++;
    message.fetchReference().then(dropMessage => {
        dropMessage.reply({
            content: format,
            allowedMentions: {
                users: analysisConfig.mention.data ? undefined : [dropper]
            }
        }).catch(_ => null);
    }).catch(_ => {
        message.reply(format + (analysisConfig.mention.data ? `\n<@${dropper}>` : "")).catch(_ => null);
    });
}

function pushSpan(time: number) {
    lastAnalysisSpans.push(time);
    if (lastAnalysisSpans.length > 10) {
        lastAnalysisSpans.shift();
    }
}