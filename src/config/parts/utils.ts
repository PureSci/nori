import { client } from "../../index.js";
import Constants from "../../utils/Constants.js";
import { SubConfigOption, SubConfigOptionFALSE, SubConfigOptionTRUE, configObjects, configTypes } from "../configTypes.js";
import { getConfigComponents, formatConfig, getOptionComponents } from "./handler.js";

configTypes.push({
    name: "utils",
    prettyName: "Utils",
    emoji: "💡",
    options: [
        {
            name: "deleteMessage",
            prettyName: "Delete Message",
            options: [
                SubConfigOptionTRUE,
                SubConfigOptionFALSE
            ],
            description: "Enabling this option allows the users to delete their Sofi messages using Discord's new apps function. Nori needs the `ManageMessages` permission for this feature.",
            serverOnly: true
        },
        {
            name: "glowIndicators",
            prettyName: "Glow Indicators",
            options: [
                SubConfigOptionTRUE,
                SubConfigOptionFALSE
            ],
            description: "Shows information about glows when viewing cards with glow / glows / glowing cards"
        }
    ]
});

configObjects["utils"] = async (guildId: string, userId: string, isServer: boolean = false) => {
    return {
        embeds: [{
            title: `${isServer ? "Server" : "User"} Utils Config`,
            description: await formatConfig("utils", guildId, userId, isServer),
            color: 15641224,
            footer: {
                text: "Use the Buttons below to toggle the attached option to it."
            },
            thumbnail: {
                url: isServer ? (client.guilds.cache.get(guildId)?.iconURL({ forceStatic: true }) ?? "") : (client.users.cache.get(userId)?.avatarURL({ forceStatic: true }) ?? "")
            }
        }],
        components: [
            ...getConfigComponents("utils", userId, isServer),
            ...getOptionComponents("utils", userId, isServer)
        ]
    }
}
