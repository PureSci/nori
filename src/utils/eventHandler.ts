import { Client, REST, Routes } from "discord.js";
import fs from "fs";
import Constants from "./constants.js";
import * as dropAnalysis from "../dropAnalysis.js";
import settings from "../../settings.json" assert {type: "json"};
import * as dotenv from 'dotenv';
dotenv.config();

const rest = new REST().setToken(process.env.TOKEN as string);

export default async function (client: Client) {
    let operationFiles = fs.readdirSync("./src/operations/");
    let operations = await Promise.all(operationFiles.map(async file => {
        let operation = await import(`../operations/${file}`);
        return {
            filter: operation.filter,
            run: operation.run
        };
    }));
    let registerCommands: string[] = [];
    let commandFiles = fs.readdirSync("./src/interactions/commands/");
    let commands = await Promise.all(commandFiles.map(async file => {
        let command = await import(`../interactions/commands/${file}`);
        if (command.register) {
            registerCommands.push(command.register.toJSON());
        }
        return {
            data: command.data,
            run: command.run
        };
    }));
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
            if (!command) return;
            if (!settings.features.some((feature: string) => feature == command?.data.feature)) return;
            command.run(message, args);
        }
    });
}