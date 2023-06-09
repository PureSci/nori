import { ChannelType, Message } from "discord.js";
import { UserConfig, getUserConfig } from "./databaseHandler.js";
import constants from "./Constants.js";
import fs from "fs";
import * as schedule from 'node-schedule';
import { client } from "../index.js";

let reminderType: {
    [key: string]: number
} = {
    "drop": 480000,
    "grab": 240000
};

let reminders: {
    [key: string]: {
        timeout: NodeJS.Timeout,
        userId: string,
        type: string,
        startTime: number,
        channelId: string,
        guildId: string
    }
} = {};

export default (message: Message, userId: string, type: string) => {
    if (reminders[userId + type]) clearTimeout(reminders[userId + type].timeout);
    let reminder = setTimeout(async () => {
        let reminderConfig = await getUserConfig(`reminders.${type}`, userId, message.guildId);
        if (!reminderConfig.data) return;
        try {
            if (message.channel.type == ChannelType.DM) return;
            let isDm = reminderConfig.data == "dm";
            let perms = message.guild?.members.me?.permissionsIn(message.channel);
            if (perms?.has("SendMessages") || isDm) {
                let sendChannel: any = message.channel;
                if (isDm) sendChannel = message.author;
                let isDmMessage = isDm ? ` <#${message.channelId}>` : "";
                sendChannel.send(`${constants.REMINDER_EMOJI} <@${userId}> You can now **${type}**!${isDmMessage}`).catch((_: any) => null);
            }
        } catch (err) { }
    }, reminderType[type]);
    reminders[userId + type] = {
        timeout: reminder,
        userId, type,
        startTime: Date.now(),
        channelId: message.channelId,
        guildId: message.guildId!
    };
}

export function saveReminders() {
    try {
        fs.writeFileSync("./reminders.json", JSON.stringify(Object.values(reminders).map(reminder => {
            return {
                userId: reminder.userId,
                type: reminder.type,
                startTime: reminder.startTime,
                channelId: reminder.channelId,
                guildId: reminder.guildId
            }
        })));
    } catch (e) { }
}

export function loadReminders() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = [17, 19, 21, 23, 1, 3, 5, 7, 9, 11, 13, 15];
    rule.minute = 23;
    schedule.scheduleJob(rule, newRaid);
    console.log('Raid Schedule Started');
    let file = fs.readFileSync("./reminders.json");
    if (!file) return;
    let data = JSON.parse(file.toString());
    data.forEach((reminder: {
        userId: string,
        type: string,
        startTime: number,
        channelId: string,
        guildId: string
    }) => {
        let time = reminderType[reminder.type] - (Date.now() - reminder.startTime);
        if (time < 1) return;
        let timeout = setTimeout(async () => {
            let reminderConfig = await getUserConfig(`reminders.${reminder.type}`, reminder.userId, reminder.guildId);
            if (!reminderConfig.data) return;
            try {
                const isDm = reminderConfig.data == "dm";
                let channel: any = await client.channels.fetch(reminder.channelId);
                const user = await client.users.fetch(reminder.userId);
                if (!channel) {
                    if (isDm) {
                        user?.send(`${constants.REMINDER_EMOJI} <@${reminder.userId}> You can now **${reminder.type}**!  <#${reminder.channelId}>`).catch(_ => null)
                    }
                    return;
                }
                if (channel.isDMBased()) return;
                let perms = (await client.guilds.fetch(reminder.guildId))?.members.me?.permissionsIn(channel);
                if (perms?.has("SendMessages") || isDm) {
                    if (isDm) channel = user;
                    let isDmMessage = isDm ? ` <#${reminder.channelId}>` : "";
                    channel.send(`${constants.REMINDER_EMOJI} <@${reminder.userId}> You can now **${reminder.type}**!${isDmMessage}`).catch((_: any) => null);
                }
            } catch (err) { }
        }, time);
        reminders[reminder.userId + reminder.type] = {
            timeout,
            userId: reminder.userId,
            type: reminder.type,
            startTime: reminder.startTime,
            channelId: reminder.channelId,
            guildId: reminder.guildId
        };
    });
}

async function newRaid() {
    const users = await UserConfig.find({
        "reminders.raid": "dm"
    }, "_id").exec();
    users.forEach(async user => {
        client.users.send(user._id, {
            content: "👹 New Raid started!"
        }).catch(_ => null);
    });
}