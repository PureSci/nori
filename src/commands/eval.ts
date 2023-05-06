import { Attachment, AttachmentBuilder, Collection, Message, SlashCommandBuilder } from "discord.js";
import settings from "../../settings.json" assert {type: "json"};
import { run as drop_run } from "../drop_analysis.js";

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
    }
}