import { APISelectMenuOption, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuInteraction, parseEmoji } from "discord.js";

import "./reminders.js";
import "./analysis.js";
import "./utils.js";

import { ConfigOption, configObjects, configTypes } from "../configTypes.js";
import { getUserConfig, setData } from "../../utils/databaseHandler.js";
function defaultComponents(userId: string, isServer: boolean) {
    let configOptions: APISelectMenuOption[] = [];
    configTypes.forEach(configType => {
        configOptions.push({
            label: configType.prettyName,
            description: `Configs for ${configType.prettyName}`,
            // @ts-ignore
            emoji: parseEmoji(configType.emoji)!,
            value: `configSelect_${configType.name}`
        });
    });
    return [
        new ActionRowBuilder<StringSelectMenuBuilder>({
            components: [
                new StringSelectMenuBuilder({
                    custom_id: `configSelector_${userId}_${isServer}`,
                    // @ts-ignore
                    options: configOptions
                })
            ]
        })
    ]
}

export function getConfigComponents(defaultOption: "reminders" | "analysis" | "utils", userId: string, isServer: boolean = false) {
    let components = defaultComponents(userId, isServer);
    components[0] // ActionRowBuilder
        .components[0] // StringSelectMenuBuilder
        .options
        .find(option => option.data.value?.endsWith(defaultOption))?.setDefault(true);
    return components;
}

export async function formatConfig(type: string, guildId: string, userId: string, isServer: boolean) {
    const configType = getConfigType(type);
    return await formatConfigComp(configType.options, configType.name, userId, guildId, isServer);
}

export async function formatConfigComp(options: ConfigOption[], query: string, userId: string, guildId: string, isServer: boolean, extraIndex?: number) {
    let configData: any = await getUserConfig(query, userId, guildId, isServer);
    if (isServer) options = options.filter(configOption => !configOption.userOnly);
    else options = options.filter(configOptions => !configOptions.serverOnly);
    return options.map((configOption, index) => {
        let config = configData[configOption.name];
        let option = configOption.options.find(option => option.name == config.data);
        return `\`${index + 1 + (extraIndex ?? 0)}]\` ${option?.emoji} • \`${configOption.prettyName}\` • **${option?.text}**${config.serverDefault && !isServer && !configOption.userOnly ? ` <:server_default:1112107708812894240>` : ""}${configOption.description ? `\n*${configOption.description}*` : ""}`;
    }).join("\n");
}

export function getOptionComponents(type: string, userId: string, isServer: boolean) {
    const configType = getConfigType(type);
    return getOptionComponentsComp(configType.options, type, userId, isServer);
}

export function getOptionComponentsComp(options: ConfigOption[], type: string, userId: string, isServer: boolean, customId?: string) {
    if (isServer) options = options.filter(x => !x.userOnly);
    else options = options.filter(x => !x.serverOnly);
    if (options.length == 0) return [];
    const computed = computeValues(options.length);
    let components = [];
    let i = 1;
    for (let _ = 0; _ < computed[0]; _++) {
        let row = new ActionRowBuilder<ButtonBuilder>();
        for (let _ = 0; _ < computed[1]; _++) {
            row.addComponents(
                new ButtonBuilder({
                    //          configOptionChange_userId_isServer_reminders_drop
                    custom_id: `${customId ?? "configOptionChange"}_${userId}_${isServer}_${type}_${options[i - 1].name}`,
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
    const data = interaction.customId.split("_");
    const type = data[3];
    const option = data[4];
    const configType = getConfigType(type);
    const currentOption = configType.options.find(opt => opt.name == option)!;
    const config = await getUserConfig(`${type}.${option}`, interaction.user.id, interaction.guildId, isServer);
    let currentSuboptionIndex = currentOption.options.findIndex(subopt => subopt.name == config.data);
    let operation = "$set";
    if (currentSuboptionIndex == currentOption.options.length - 1) {
        if ((!isServer) && (!config.serverDefault) && !currentOption.userOnly) {
            operation = "$unset";
            currentSuboptionIndex = 0;
        } else {
            currentSuboptionIndex = -1;
        }
    } // maybe else if (idk)
    if (config.serverDefault && !isServer) currentSuboptionIndex = -1;
    await setData(isServer ? interaction.guildId! : interaction.user.id, `${type}.${option}`, currentOption.options[currentSuboptionIndex + 1].name, isServer, operation);
    interaction.message.edit(await configObjects[type](interaction.guildId!, interaction.user.id, isServer));
    interaction.deferUpdate();
}

function getConfigType(type: string) {
    return configTypes.find(configType => configType.name == type)!;
}

function computeValues(num: number): [number, number] {
    let first: number = 1;
    let second: number = 2;
    if (num == 1) second = 1;
    while (num > first * second) {
        second += 1;
        if (second > 5) {
            first += 1;
            second = 3;
        }
    }

    return [first, second];
}