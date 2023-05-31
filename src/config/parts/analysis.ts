import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { SubConfigOption, SubConfigOptionFALSE, SubConfigOptionTRUE, configObjects, configTypes, customInteractions, customModalInteractions } from "../configTypes.js";
import { getConfigComponents, formatConfig, getOptionComponents, getOptionComponentsComp, formatConfigComp } from "./handler.js";
import { UserConfig, getUserConfig, setData } from "../../utils/databaseHandler.js";
import { fetchFormat } from "../../utils/index.js";
import { Character } from "../../../rust-workers/rust-workers.js";
import { client } from "../../index.js";

configTypes.push({
    name: "analysis",
    prettyName: "Drop Analysis",
    emoji: "🔍",
    serverOnly: false,
    options: []
});

const exampleCharData: Character[] = [
    {
        name: "Nori",
        series: "Mascots",
        gen: "54",
        wl: 100
    },
    {
        name: "Cooler Nori",
        series: "Mascots",
        gen: "1384",
        wl: 540
    },
    {
        name: "Coolest Nori",
        series: "Mascots",
        gen: "714",
        wl: 2498
    }
];

const presets = {
    standart: {
        prettyName: "Standard",
        description: "Default Preset, looks the best fr",
        format: (config: any) => {
            return `${config.showNumbers.data ? "`1]` • " : ""}:heart: \`{wl1}\`${config.showGen.data ? "• `ɢ{gen1}`" : ""} • **{cardname1}**${config.showSeries.data ? " • {cardseries1}" : ""}\n{copy1?2}\n{copy1?3}`;
        },
        options: [
            {
                name: "showNumbers",
                prettyName: "Show Numbers",
                options: [
                    SubConfigOptionTRUE,
                    SubConfigOptionFALSE
                ]
            },
            {
                name: "showGen",
                prettyName: "Show Gen",
                options: [
                    SubConfigOptionTRUE,
                    SubConfigOptionFALSE
                ]
            },
            {
                name: "showSeries",
                prettyName: "Show Series",
                options: [
                    SubConfigOptionTRUE,
                    SubConfigOptionFALSE
                ]
            }
        ]
    },
    fancy: {
        prettyName: "Fancy",
        description: "Too fancy :sob:",
        format: (config: any) => {
            return `\`1}\`🤍  ̗̀➛ \`{wl1}\` 🕸\`ɢ{gen1}\` ˚₊· ͟͟͞➳❥ ***{cardname1}***‧₊˚ *{cardseries1}*\n` +
                `\`2}\`🎧  ̗̀➛ \`{wl2}\` 🕸\`ɢ{gen2}\` ˚₊· ͟͟͞➳❥ ***{cardname2}***‧₊˚ *{cardseries2}*\n` +
                `\`3}\`🥀  ̗̀➛ \`{wl3}\` 🕸\`ɢ{gen3}\` ˚₊· ͟͟͞➳❥ ***{cardname3}***‧₊˚ *{cardseries3}*`
        },
        options: []
    },
    custom: {
        prettyName: "Custom",
        description: "Advanced Config",
        format: (args: any[]) => { },
        options: []
    }
};

const permOptions = [
    {
        name: "enabled",
        prettyName: "Analysis",
        options: [
            SubConfigOptionTRUE,
            SubConfigOptionFALSE
        ]
    },
    {
        name: "mention",
        prettyName: "Ping Me",
        options: [
            SubConfigOptionTRUE,
            SubConfigOptionFALSE
        ]
    }
];

configObjects["analysis"] = async (guildId: string, userId: string, isServer: boolean = false) => {
    const configPreset = await getUserConfig("analysis.preset", userId, guildId, isServer);
    const format = await getUserConfig("analysis.format", userId, guildId, isServer);
    const preset = presets[configPreset.data as keyof typeof presets];
    const options: {
        name: string;
        prettyName: string;
        options: SubConfigOption[];
    }[] = permOptions.concat(preset.options);
    let buttonOpts = getOptionComponentsComp(options, configPreset.data, userId, isServer, "configOptionChangeAnalysis");
    if (configPreset.data == "custom") buttonOpts[0].addComponents(new ButtonBuilder({
        custom_id: "analysis_advancedFormat_" + userId,
        label: "Customize Format",
        style: ButtonStyle.Primary
    }));
    return {
        embeds: [{
            title: `${isServer ? "Server" : "User"} Analysis Config`,
            description: await formatConfigComp(permOptions, "analysis", userId, guildId, isServer) + "\n\n" + (
                configPreset.data == "custom" ? `Current Format:\n\`\`\`md\n${format.data}\n\`\`\``
                    : await formatConfigComp(preset.options, `analysis.presets.${configPreset.data}`, userId, guildId, isServer, 2) + "\n")
                + `\nAppearance:\n${fetchFormat(format.data, exampleCharData)}`
            ,
            color: 15641224,
            footer: {
                text: "Use the Buttons below to toggle the attached option to it."
            },
            thumbnail: {
                url: isServer ? (client.guilds.cache.get(guildId)?.iconURL({ forceStatic: true }) ?? "") : (client.users.cache.get(userId)?.avatarURL({ forceStatic: true }) ?? "")
            }
        }],
        components: [
            ...getConfigComponents("analysis", userId, isServer),
            new ActionRowBuilder<StringSelectMenuBuilder>({
                components: [
                    new StringSelectMenuBuilder({
                        custom_id: `analysisPresetSelect_${userId}_${isServer}`,
                        options: Object.keys(presets).map(key => {
                            const preset = presets[key as keyof typeof presets];
                            return {
                                label: preset.prettyName,
                                description: preset.description,
                                default: configPreset.data == key,
                                value: key
                            };
                        })
                    })
                ]
            }),
            ...buttonOpts
        ]
    }
}

customInteractions.push({
    filter: (interaction) => {
        return interaction.customId.startsWith("configOptionChangeAnalysis_") && interaction.customId.split("_")[1] == interaction.user.id;
    },
    run: async (interaction) => {
        // configOptionChangeaAnalysis_353623899184824330_user_standart_showNumbers
        // 0                           1                  2    3        4
        const data = interaction.customId.split("_");
        const isServer = data[2] == "server";
        let options = permOptions.concat(presets[data[3] as keyof typeof presets].options).find(option => option.name == data[4])?.options!;
        let query = `analysis.presets.${data[3]}.${data[4]}`;
        const isTopData = data[4] == "enabled" || data[4] == "mention";
        if (isTopData) query = `analysis.${data[4]}`;
        const config = await getUserConfig(query, interaction.user.id, interaction.guildId, isServer);
        let currentSuboptionIndex = options.findIndex(subopt => subopt.name == config.data);
        let operation = "$set";
        if (currentSuboptionIndex == options.length - 1) {
            if ((!isServer) && (!config.serverDefault)) {
                operation = "$unset";
                currentSuboptionIndex = 0;
            } else {
                currentSuboptionIndex = -1;
            }
        } // maybe else if (idk)
        if (config.serverDefault && !isServer) currentSuboptionIndex = -1;
        await setData(isServer ? interaction.guildId! : interaction.user.id, query, options[currentSuboptionIndex + 1].name, isServer, operation);
        if (!isTopData) {
            const fullConfig = await getUserConfig(`analysis.presets.${data[3]}`, interaction.user.id, interaction.guildId, isServer);
            await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.format", presets[data[3] as keyof typeof presets].format(fullConfig), isServer);
        }
        interaction.message.edit(await configObjects["analysis"](interaction.guildId!, interaction.user.id, isServer));
        interaction.deferUpdate();
    }
});

customInteractions.push({
    filter: (interaction) => {
        return interaction.customId.startsWith("analysis_advancedFormat") && interaction.customId.split("_")[2] == interaction.user.id;
    },
    run: async (interaction) => {
        const isServer = interaction.customId.split("_")[3] == "true";
        const format = await getUserConfig("analysis.format", interaction.user.id, interaction.guildId, isServer);
        interaction.showModal(
            new ModalBuilder({
                custom_id: `analysis_advancedModal_${interaction.user.id}_${isServer}`,
                title: "Customize Format",
                components: [
                    new ActionRowBuilder<TextInputBuilder>({
                        components: [
                            new TextInputBuilder({
                                custom_id: "format",
                                label: "Format",
                                max_length: 500,
                                min_length: 1,
                                style: TextInputStyle.Paragraph,
                                required: true,
                                value: format.data
                            })
                        ]
                    })
                ]
            })
        )
    }
});

customModalInteractions.push({
    filter: (interaction) => {
        return interaction.customId.startsWith("analysis_advancedModal") && interaction.customId.split("_")[2] == interaction.user.id;
    },
    run: async (interaction) => {
        const value = interaction.fields.getTextInputValue("format");
        const isServer = interaction.customId.split("_")[3] == "true";
        await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.format", value, isServer);
        await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.presets.custom.format", value, isServer);
        interaction.message?.edit(await configObjects["analysis"](interaction.guildId!, interaction.user.id, isServer));
        interaction.reply({
            content: "Successfully updated the format",
            ephemeral: true
        });
    }
});

customInteractions.push({
    filter: (interaction) => {
        const splitted = interaction.customId.split("_");
        return splitted[0] == "analysisPresetSelect" && splitted[1] == interaction.user.id;
    },
    run: async (interaction) => {
        const splitted = interaction.customId.split("_");
        const isServer = splitted[2] == "true";
        const preset = (interaction as StringSelectMenuInteraction).values[0];
        await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.preset", preset, isServer);
        if (preset == "custom") {
            const format = await getUserConfig("analysis.presets.custom.format", interaction.user.id, interaction.guildId, isServer);
            await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.format", format.data, isServer);
        } else {
            const fullConfig = await getUserConfig(`analysis.presets.${preset}`, interaction.user.id, interaction.guildId, isServer);
            await setData(isServer ? interaction.guildId! : interaction.user.id, "analysis.format", presets[preset as keyof typeof presets].format(fullConfig), isServer);
        }
        await interaction.message.edit(await configObjects["analysis"](interaction.guildId!, interaction.user.id, isServer));
        interaction.deferUpdate();
    },
});
