import { Attachment, AttachmentBuilder, Collection, Message, SlashCommandBuilder } from "discord.js";
import settings from "../../../settings.json" assert {type: "json"};
import { run as drop_run } from "../../drop_analysis.js";
import { run as captcha_run } from "../../operations/captcha_drop.js";
import { run as seriesone_run } from "../../operations/series_one.js";

export const data = {
    "aliases": ["eval", "e"],
    "feature": "developer"
};

export async function run(message: Message, args: string[]) {
    if (!settings.developers.some(developer => developer == message.author.id)) return;
    switch (args[0]) {
        case "drop":
            let attachment = "https://cdn.discordapp.com/attachments/1060674994859933846/1100292266788143224/18c3ec4b-dc10-4567-8657-d2037c83e3df.webp";
            if (args.length > 1) {
                attachment = args.slice(1).join(" ");
            }
            message.content = `<@${message.author.id}> is dropping the cards`;
            drop_run(message, attachment);
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
            }).then(m => {
                drop_run(m);
            });
            break;
        case "captcha":
            let captcha_attachment = "https://cdn.discordapp.com/attachments/1060674994859933846/1089522639413981264/card.png";
            if (args.length > 1) {
                captcha_attachment = args.slice(1).join(" ");
            }
            message.channel.send({
                embeds: [{
                    title: "Captcha Drop",
                    image: {
                        url: captcha_attachment
                    }
                }]
            }).then(m => {
                captcha_run(m);
            });
            break;
        case "seriesone":
            message.channel.send({
                embeds: [{
                    description: `**I will drop cards from the most voted series :smugsofi:
                    1] Soul Eater NOT!
                    2] Cross Game
                    3] Terra Formars: Revenge
                    `
                }]
            }).then(m => {
                seriesone_run(m);
            })
    }
}