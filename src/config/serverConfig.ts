import { ChatInputCommandInteraction, Message, PermissionFlagsBits, SlashCommandBuilder, User } from "discord.js";
import { configObjects } from "./configTypes.js";

export const data = {
    "aliases": ["serverconfig", "serverconf"],
    "feature": "config"
};

export const register = new SlashCommandBuilder()
    .setName("serverconfig")
    .setDMPermission(false)
    .setDescription("Opens the config menu for the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export function interactionRun(interaction: ChatInputCommandInteraction) {
    run(interaction, interaction.user);
}

export function messageRun(message: Message) {
    run(message, message.author);
}

async function run(message: Message | ChatInputCommandInteraction, user: User) {
    message.reply(await configObjects["reminders"](message.guildId!, user.id, true));
}