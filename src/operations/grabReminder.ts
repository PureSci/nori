import { Message } from "discord.js";
import { getUserConfig } from "../utils/databaseHandler.js";
import reminderHandler from "../utils/reminderHandler.js";

export function filter(message: Message): boolean {
    return message.content.includes("battled") || message.content.includes("took the card");
}

export async function run(message: Message) {
    let userId = message.content.split("<@")[1].split(">")[0];
    let grabConfig = await getUserConfig("reminders.grab", userId, message.guildId);
    if (grabConfig.data) reminderHandler(message, userId, "grab");
}
