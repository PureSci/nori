import { ActivityType, Client, TextChannel } from "discord.js";
import eventHandler from "./utils/eventHandler.js";
import * as dotenv from 'dotenv';
import { loadReminders, saveReminders } from "./utils/reminderHandler.js";
import settings from "../settings.json" assert {type: "json"};
dotenv.config();

export const client = new Client({
    intents: ["Guilds", "GuildMessages", "MessageContent"]
});

client.once("ready", () => {
    console.log(`Bot is in ${client.guilds.cache.size} servers.`);
    const channel = (client.channels.cache.get(settings.developerChannelId)!) as TextChannel;
    const statusChannel = (client.channels.cache.get(settings.statusChannelId)!) as TextChannel;
    client.on("guildCreate", guild => {
        guild.members.cache.get(client.user?.id!)?.setNickname("Nori").catch(_ => null);
        setActivity(client);
        channel?.send(`Joined Guild\n**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Member Count:** ${guild.memberCount}`);
    });
    client.on("guildDelete", guild => {
        setActivity(client);
        channel?.send(`:x: **Left** Guild\n**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Member Count:** ${guild.memberCount}`);
    });
    setActivity(client);
    loadReminders();
    eventHandler(client);
    statusChannel.send("Nori is getting ready!");
});

function setActivity(client: Client) {
    client.user?.setActivity(`${client.guilds.cache.size} servers | v0.8.9 Open Beta`, {
        type: ActivityType.Watching
    });
}

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on("SIGINT", () => {
    saveReminders();
    process.exit(1);
});

client.login(process.env.TOKEN);