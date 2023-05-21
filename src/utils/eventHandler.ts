import { ChatInputCommandInteraction, Client, Message, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import Constants from "./Constants.js";
import * as dropAnalysis from "../dropAnalysis.js";
import settings from "../../settings.json" assert {type: "json"};
import * as dotenv from 'dotenv';
import { handleConfigSelector, handleOptionChange } from "../config/parts/handler.js";
dotenv.config();

const rest = new REST().setToken(process.env.TOKEN as string);

interface Command {
    data: {
        aliases: string[],
        feature: string
    },
    register?: SlashCommandBuilder,
    interactionRun?(interaction: ChatInputCommandInteraction): void,
    messageRun(message: Message, args: string[]): void
}

export default async function (client: Client) {
    let operationFiles = fs.readdirSync("./src/operations/");
    let operations = await Promise.all(operationFiles.map(async file => {
        let operation = await import(`../operations/${file}`);
        return {
            filter: operation.filter,
            run: operation.run
        };
    }));
    let editOperationFiles = fs.readdirSync("./src/editOperations/");
    let editOperations = await Promise.all(editOperationFiles.map(async file => {
        let operation = await import(`../editOperations/${file}`);
        return {
            filter: operation.filter,
            run: operation.run
        };
    }));
    let registerCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    let commandFiles = fs.readdirSync("./src/interactions/commands/");
    let commands: Command[] = [];
    let initCommand = async (file: string, path: string = `../interactions/commands/${file}`) => {
        let command: Command = await import(path);
        if (!command.data) return;
        if (!settings.features.some(feature => feature == command.data.feature)) return;
        if (command.register) registerCommands.push(command.register.toJSON());
        commands.push(command);
    }
    for (const file of commandFiles) {
        await initCommand(file);
    }
    for (const file of fs.readdirSync("./src/config/").filter(file => !fs.statSync(`./src/config/${file}`).isDirectory())) {
        await initCommand(file, `../config/${file}`);
    }
    rest.put(Routes.applicationCommands(client.user?.id as string), {
        body: registerCommands
    });
    client.on("messageCreate", message => {
        if (!message.guildId) return;
        if (message.author.id == Constants.SOFI_ID) {
            if (settings.features.includes("dropAnalysis") && dropAnalysis.filter(message)) {
                return dropAnalysis.run(message);
            }
            operations.forEach(async operation => {
                if (operation.filter(message)) {
                    operation.run(message);
                };
            });
        } else if (message.content.startsWith(settings.prefix)) {
            let commandSplitted = message.content.slice(settings.prefix.length).split(" ");
            let commandName = commandSplitted[0];
            let args = commandSplitted.slice(1);
            let command = commands.find(command => command.data.aliases.some((alias: string) => alias == commandName));
            if (command) command.messageRun(message, args);
        }
    });
    client.on("messageUpdate", (oldMessage, newMessage) => {
        if (!newMessage.guildId) return;
        if (newMessage.author && newMessage.author.id == Constants.SOFI_ID) {
            editOperations.forEach(async operation => {
                if (operation.filter(newMessage)) operation.run(newMessage);
            });
        }
    });
    client.on("interactionCreate", interaction => {
        if (!interaction.guildId) return;
        if (interaction.isChatInputCommand()) {
            let command = commands.find(command => command.data.aliases.some((alias: string) => alias == interaction.commandName));
            if (command && command.interactionRun) command.interactionRun(interaction);
        } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith("configSelector")) {
            let data = interaction.customId.split("_"); // 1: userId, 2: isServer
            if (data[1] !== interaction.user.id) return;
            handleConfigSelector(interaction, data[2] == "true");
        } else if (interaction.isButton() && interaction.customId.startsWith("")) {
            let data = interaction.customId.split("_");
            if (data[1] !== interaction.user.id) return;
            handleOptionChange(interaction, data[2] == "true");
        }
    });
}