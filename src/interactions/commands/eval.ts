import { Message } from "discord.js";
import settings from "../../../settings.json" assert {type: "json"};
import humanizeDuration from "humanize-duration";
import { analysisCount, analysisStartTime, averageSpan, run as dropRun, lastAnalysisSpans } from "../../dropAnalysis.js";
import { run as captchaRun } from "../../operations/captchaDrop.js";
import { run as seriesTwoRun } from "../../operations/seriesTwo.js";
import { run as minigameRun } from "../../operations/minigame.js";
import { saveReminders } from "../../utils/reminderHandler.js";

export const data = {
    "aliases": ["eval", "e"],
    "feature": "developer"
};

export function messageRun(message: Message, args: string[]) {
    run(message, args);
}

async function run(message: Message, args: string[]) {
    if (!settings.developers.some(developer => developer == message.author.id)) return;
    switch (args[0]) {
        case "drop":
            let attachment = "https://cdn.discordapp.com/attachments/1060674994859933846/1100292266788143224/18c3ec4b-dc10-4567-8657-d2037c83e3df.webp";
            if (args.length > 1) attachment = args.slice(1).join(" ");
            message.content = `<@${message.author.id}> is dropping the cards`;
            dropRun(message, attachment);
            break;
        case "dropn":
            message.channel.send({
                content: `<@${message.author.id}> is dropping the cards`,
                embeds: [{
                    title: "SOFI: DROP",
                    fields: [{
                        name: "Gen 752",
                        value: `\`\`\`\nMae\n\nFire Emblem Echoe-\n\`\`\``,
                        inline: true
                    }, {
                        name: "Gen 245",
                        value: `\`\`\`\nHana Odagiri\n\nThe Anthem of the-\n\`\`\``,
                        inline: true
                    }, {
                        name: "Gen 1321",
                        value: `\`\`\`\nYamamoto\n\nGolden Kamuy\n\`\`\``,
                        inline: true
                    }],
                    color: 14133492
                }],
            }).then(m => dropRun(m));
            break;
        case "captcha":
            let captchaAttachment = "https://cdn.discordapp.com/attachments/1060674994859933846/1089522639413981264/card.png";
            if (args.length > 1) captchaAttachment = args.slice(1).join(" ");
            message.channel.send({
                embeds: [{
                    title: "Captcha Drop",
                    image: {
                        url: captchaAttachment
                    }
                }]
            }).then(m => captchaRun(m));
            break;
        case "seriestwo":
            let seriesTwoAttachment = "https://cdn.discordapp.com/attachments/1005561572623659069/1108748128678576168/drop.png"
            if (args.length > 1) seriesTwoAttachment = args.slice(1).join(" ");
            message.channel.send({
                files: [seriesTwoAttachment]
            }).then(m => seriesTwoRun(m));
            break;
        case "minigame":
            message.channel.send({
                embeds: [{
                    description: "**Mike** *(Subway Surfers)* **| :woodw: Wood**"
                }]
            }).then(m => minigameRun(m));
            break;
        case "mets":
            if (args[1] == "drop") {
                message.reply({
                    embeds: [{
                        title: "Drop Analysis Metrics",
                        description: `**Analysis Avg:** ${averageSpan.toFixed(2)}ms\n` +
                            `**Analysis/m:** ${(analysisCount / ((Date.now() - analysisStartTime) / 60000)).toFixed(2)}\n` +
                            `**Last 10 Analysis:**\n${lastAnalysisSpans.map(x => `\`${x}\`ms`).join("\n")}`,
                        color: 15105570
                    }]
                });
            } else message.reply({
                embeds: [{
                    title: "Dev Metrics",
                    description: `**Uptime:** ${humanizeDuration(process.uptime() * 1000, { maxDecimalPoints: 2 })}\n` +
                        `**Analysis Avg:** ${averageSpan.toFixed(2)}ms\n` +
                        `**Analysis/m:** ${(analysisCount / ((Date.now() - analysisStartTime) / 60000)).toFixed(2)}\n` +
                        `**API latency:** ${message.client.ws.ping}ms`,
                    color: 15105570
                }]
            });
            break;
        case "restart":
            saveReminders();
            process.exit(1);
    }
}