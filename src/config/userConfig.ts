import { ChatInputCommandInteraction, Message, SlashCommandBuilder, User } from "discord.js";
import { configObjects } from "./configTypes.js";

export const data = {
    "aliases": ["config", "conf"],
    "feature": "config"
};

export const register = new SlashCommandBuilder()
    .setName("config")
    .setDMPermission(false)
    .setDescription("Opens the config menu");

export function interactionRun(interaction: ChatInputCommandInteraction) {
    run(interaction, interaction.user);
}

export function messageRun(message: Message, args: string[]) {
    run(message, message.author);
}

async function run(message: Message | ChatInputCommandInteraction, user: User) {
    message.reply(await configObjects["reminders"](message.guildId!, user.id));
}