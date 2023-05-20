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
    emoji: "🔍",
    server_only: false,
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
        }
    ]
});

configObjects["reminders"] = async (guildId: string, userId: string, isServer: boolean = false) => {
    return {
        embeds: [{
            title: `User Reminder Config`,
            description: await formatConfig("reminders", guildId, userId),
            color: 15641224,
            footer: {
                text: "Use the Buttons below to toggle the attached option to it."
            }
        }],
        components: [
            ...getConfigComponents("reminders", userId, isServer),
            ...getOptionComponents("reminders", userId, isServer)
        ]
    }
}
