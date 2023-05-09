import { Client, REST, Routes } from "discord.js";
import fs from "fs";
import Constants from "./constants.js";
import * as drop_analysis from "../drop_analysis.js";
import settings from "../../settings.json" assert {type: "json"};
import * as dotenv from 'dotenv';
dotenv.config();

const rest = new REST().setToken(process.env.TOKEN as string);

export default async function (client: Client) {
    let operation_files = fs.readdirSync("./src/operations/");
    let operations = await Promise.all(operation_files.map(async file => {
        let operation = await import(`../operations/${file}`);
        return {
            filter: operation.filter,
            run: operation.run
        };
    }));
    let register_commands: string[] = [];
    let command_files = fs.readdirSync("./src/interactions/commands/");
    let commands = await Promise.all(command_files.map(async file => {
        let command = await import(`../interactions/commands/${file}`);
        if (command.register) {
            register_commands.push(command.register.toJSON());
        }
        return {
            data: command.data,
            run: command.run
        };
    }));
    rest.put(Routes.applicationCommands(client.user?.id as string), {
        body: register_commands
    });
    client.on("messageCreate", message => {
        if (!message.guildId) return;
        if (message.author.id == Constants.SOFI_ID) {
            if (settings.features.includes("drop_analysis") && drop_analysis.filter(message)) {
                return drop_analysis.run(message);
            }
            operations.forEach(async operation => {
                if (operation.filter(message)) {
                    operation.run(message);
                };
            });
        } else if (message.content.startsWith(settings.prefix)) {
            let command_splitted = message.content.slice(settings.prefix.length).split(" ");
            let command_name = command_splitted[0];
            let args = command_splitted.slice(1);
            let command = commands.find(command => command.data.aliases.some((alias: string) => alias == command_name));
            if (!command) return;
            if (!settings.features.some((feature: string) => feature == command?.data.feature)) return;
            command.run(message, args);
        }
    });
}