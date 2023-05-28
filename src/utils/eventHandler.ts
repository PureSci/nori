import { ChatInputCommandInteraction, Client, Message, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import Constants from "./Constants.js";
import * as dropAnalysis from "../dropAnalysis.js";
import settings from "../../settings.json" assert {type: "json"};
import * as dotenv from 'dotenv';
import { handleConfigSelector, handleOptionChange } from "../config/parts/handler.js";
import { customInteractions, customModalInteractions } from "../config/configTypes.js";
dotenv.config();

const rest = new REST().setToken(process.env.TOKEN!);

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
    let operations = await initOperations("./src/operations/", "../operations/");
    let editOperations = await initOperations("./src/editOperations/", "../editOperations/");
    let [commands, registerCommands] = await initCommands();

    await rest.put(Routes.applicationCommands(client.user?.id as string), {
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
            if (command?.interactionRun) command.interactionRun(interaction);
        } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith("configSelector")) {
            let data = interaction.customId.split("_"); // 1: userId, 2: isServer
            if (data[1] !== interaction.user.id) return;
            handleConfigSelector(interaction, data[2] == "true");
        } else if (interaction.isButton() && interaction.customId.startsWith("configOptionChange_")) {
            let data = interaction.customId.split("_");
            if (data[1] !== interaction.user.id) return;
            handleOptionChange(interaction, data[2] == "true");
        } else if (interaction.isMessageComponent()) {
            customInteractions.forEach(customInteraction => {
                if (customInteraction.filter(interaction)) customInteraction.run(interaction);
            });
        } else if (interaction.isModalSubmit()) {
            customModalInteractions.forEach(customModalInteraction => {
                if (customModalInteraction.filter(interaction)) customModalInteraction.run(interaction);
            });
        }
    });
}

async function initCommands(): Promise<[Command[], RESTPostAPIChatInputApplicationCommandsJSONBody[]]> {
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
    return [commands, registerCommands];
}

async function initOperations(pathsrc: string, pathrel: string) {
    let operationFiles = fs.readdirSync(pathsrc);
    return await Promise.all(operationFiles.map(async file => {
        let operation = await import(`${pathrel}${file}`);
        return {
            filter: operation.filter,
            run: operation.run
        };
    }));
}