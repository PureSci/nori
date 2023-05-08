import { ChannelType, Message } from "discord.js";
import { get_user_config } from "./database_handler.js";
import constants from "./constants.js";

let reminder_type: {
    [key: string]: number
} = {
    "drop": 480000,
    "grab": 240000
};

let reminders: {
    [key: string]: NodeJS.Timeout
} = {};

export default (message: Message, user_id: string, type: string) => {
    if (reminders[user_id + type]) clearTimeout(reminders[user_id + type]);
    let reminder = setTimeout(async () => {
        let reminder_config = await get_user_config(`reminders.${type}`, user_id, message.guildId);
        if (!reminder_config.data) return;
        try {
            if (message.channel.type == ChannelType.DM) return;
            let perms = message.guild?.members.me?.permissionsIn(message.channel);
            if (perms?.has("SendMessages")) {
                let send_channel: any = message.channel;
                let is_dm = reminder_config.data == "dm";
                if (is_dm) send_channel = message.author;
                let is_dm_msg = is_dm ? ` <#${message.channelId}>` : "";
                send_channel.send(`${constants.REMINDER_EMOJI} <@${user_id}> You can now **${type}**!${is_dm_msg}`);
            }
        } catch (err) { }
    }, reminder_type[type]);
    reminders[user_id + type] = reminder;
}