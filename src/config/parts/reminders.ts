import { client } from "../../index.js";
import Constants from "../../utils/Constants.js";
import { SubConfigOption, SubConfigOptionFALSE, SubConfigOptionTRUE, configObjects, configTypes } from "../configTypes.js";
import { getConfigComponents, formatConfig, getOptionComponents } from "./handler.js";
let SubConfigOptionDM: SubConfigOption = {
    name: "dm",
    text: "Enabled DM",
    emoji: Constants.ON_EMOJI
}

configTypes.push({
    name: "reminders",
    prettyName: "Reminders",
    emoji: "<:reminder_set:1061639553154285669> ",
    serverOnly: false,
    options: [
        {
            name: "drop",
            prettyName: "Drop",
            options: [
                SubConfigOptionTRUE,
                SubConfigOptionDM,
                SubConfigOptionFALSE
            ]
        },
        {
            name: "grab",
            prettyName: "Grab",
            options: [
                SubConfigOptionTRUE,
                SubConfigOptionDM,
                SubConfigOptionFALSE
            ]
        },
        {
            name: "raid",
            prettyName: "Raid",
            options: [
                SubConfigOptionDM,
                SubConfigOptionFALSE
            ],
            userOnly: true,
            description: "This option will make Nori dm you everytime a new guild raid begins, independent of whether you raided or not."
        }
    ]
});

configObjects["reminders"] = async (guildId: string, userId: string, isServer: boolean = false) => {
    return {
        embeds: [{
            title: `${isServer ? "Server" : "User"} Reminder Config`,
            description: await formatConfig("reminders", guildId, userId, isServer),
            color: 15641224,
            footer: {
                text: "Use the Buttons below to toggle the attached option to it."
            },
            thumbnail: {
                url: isServer ? (client.guilds.cache.get(guildId)?.iconURL({ forceStatic: true }) ?? "") : (client.users.cache.get(userId)?.avatarURL({ forceStatic: true }) ?? "")
            }
        }],
        components: [
            ...getConfigComponents("reminders", userId, isServer),
            ...getOptionComponents("reminders", userId, isServer)
        ]
    }
}
