import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuInteraction, parseEmoji } from "discord.js";

import "./reminders.js";

import { configObjects, configTypes } from "../configTypes.js";
import { UserConfig, getUserConfig } from "../../utils/databaseHandler.js";
function defaultComponents(userId: string, isServer: boolean) {
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>({
            components: [
                new StringSelectMenuBuilder({
                    custom_id: `configSelector_${userId}_${isServer}`,
                })
                    .addOptions(
                        // @ts-ignore
                        configTypes.map(configType => {
                            return {
                                label: configType.prettyName,
                                description: `Configs for ${configType.prettyName}`,
                                // @ts-ignore
                                emoji: parseEmoji(configType.emoji),
                                value: `configSelect_${configType.name}`
                            }
                        })
                    )
            ]
        })
    ]
}

export function getConfigComponents(defaultOption: "reminders" | "analysis", userId: string, isServer: boolean = false) {
    let components = defaultComponents(userId, isServer);
    components[0] // ActionRowBuilder
        .components[0] // StringSelectMenuBuilder
        .options
        .find(option => option.data.value?.endsWith(defaultOption))?.setDefault(true);
    return components;
}

export async function formatConfig(type: string, guildId: string, userId: string) {
    const configType = getConfigType(type);
    let configData: any = await getUserConfig(configType.name, userId, guildId);
    return configType.options.map((configOption, index) => {
        let config = configData[configOption.name];
        let option = configOption.options.find(option => option.name == config.data);
        return `\`${index + 1}]\` ${option?.emoji} • \`${configOption.prettyName}\` • **${option?.text}**${config.serverDefault ? " <Server Default>" : ""}`;
    }).join("\n");
}

export function getOptionComponents(type: string, userId: string, isServer: boolean) {
    const configType = getConfigType(type);
    let computed = computeValues(configType.options.length);
    let components = [];
    let i = 1;
    for (let _ = 0; _ < computed[0]; _++) {
        let row = new ActionRowBuilder<ButtonBuilder>();
        for (let _ = 0; _ < computed[1]; _++) {
            row.addComponents(
                new ButtonBuilder({
                    //          configOptionChange_userId_isServer_reminders_drop
                    custom_id: `configOptionChange_${userId}_${isServer ? "server" : "user"}_${type}_${configType.options[i - 1].name}`,
                    style: ButtonStyle.Primary,
                    label: `${i}`,
                })
            )
            i++;
        }
        components.push(row);
    }
    return components;
}

export async function handleConfigSelector(interaction: StringSelectMenuInteraction, isServer: boolean) {
    let value = interaction.values[0].split("_")[1];
    interaction.message.edit(await configObjects[value](interaction.guildId!, interaction.user.id, isServer));
    interaction.deferUpdate();
}

export async function handleOptionChange(interaction: ButtonInteraction, isServer: boolean) {
    let data = interaction.customId.split("_");
    let type = data[3];
    let option = data[4];
    let configType = getConfigType(type);
    let currentOption = configType.options.find(opt => opt.name == option)!;
    let config = await getUserConfig(`${type}.${option}`, interaction.user.id, interaction.guildId, isServer);
    let currentSuboptionIndex = currentOption.options.findIndex(subopt => subopt.name == config.data);
    let operation = "$set";
    if (currentSuboptionIndex == currentOption.options.length - 1) {
        operation = "$unset";
        currentSuboptionIndex = 0;
    } else if (config.serverDefault && !isServer) currentSuboptionIndex = -1;
    await UserConfig.findByIdAndUpdate(interaction.user.id, {
        [operation]: {
            [`${type}.${option}`]: currentOption.options[currentSuboptionIndex + 1].name
        }
    }, { upsert: true }).exec();
    interaction.message.edit(await configObjects[type](interaction.guildId!, interaction.user.id, isServer));
    interaction.deferUpdate();
}

function getConfigType(type: string) {
    return configTypes.find(configType => configType.name == type)!;
}

function computeValues(num: number): [number, number] {
    let first: number = 1;
    let second: number = 2;

    while (num > first * second) {
        second += 1;
        if (second > 5) {
            first += 1;
            second = 3;
        }
    }

    return [first, second];
}