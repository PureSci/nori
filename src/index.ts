import Discord from "discord.js";
import eventHandler from "./utils/eventHandler.js";
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Discord.Client({
    intents: ["Guilds", "GuildMessages", "MessageContent"]
});


client.on("ready", () => {
    console.log(`Bot is in ${client.guilds.cache.size} servers.`);
    eventHandler(client);
});

client.login(process.env.TOKEN);