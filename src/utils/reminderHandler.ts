import { ChannelType, Message } from "discord.js";
import { getUserConfig } from "./databaseHandler.js";
import constants from "./Constants.js";

let reminderType: {
    [key: string]: number
} = {
    "drop": 480000,
    "grab": 240000
};

let reminders: {
    [key: string]: NodeJS.Timeout
} = {};

export default (message: Message, userId: string, type: string) => {
    if (reminders[userId + type]) clearTimeout(reminders[userId + type]);
    let reminder = setTimeout(async () => {
        let reminderConfig = await getUserConfig(`reminders.${type}`, userId, message.guildId);
        if (!reminderConfig.data) return;
        try {
            if (message.channel.type == ChannelType.DM) return;
            let perms = message.guild?.members.me?.permissionsIn(message.channel);
            if (perms?.has("SendMessages")) {
                let sendChannel: any = message.channel;
                let isDm = reminderConfig.data == "dm";
                if (isDm) sendChannel = message.author;
                let isDmMessage = isDm ? ` <#${message.channelId}>` : "";
                sendChannel.send(`${constants.REMINDER_EMOJI} <@${userId}> You can now **${type}**!${isDmMessage}`);
            }
        } catch (err) { }
    }, reminderType[type]);
    reminders[userId + type] = reminder;
}