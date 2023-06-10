import { Interaction, InteractionReplyOptions, MessageComponentInteraction, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction } from "discord.js";
import Constants from "../utils/Constants.js";

export let configTypes: ConfigType[] = [];

export let configObjects: {
    [key: string]: (guildId: string, userId: string, isServer?: boolean) => Promise<MessageReplyOptions & InteractionReplyOptions & MessageEditOptions>
} = {};

export let customInteractions: {
    filter: (interaction: MessageComponentInteraction) => boolean,
    run: (interaction: MessageComponentInteraction) => void
}[] = [];

export let customModalInteractions: {
    filter: (interaction: ModalSubmitInteraction) => boolean,
    run: (interaction: ModalSubmitInteraction) => void
}[] = [];

export interface ConfigType {
    name: string,
    prettyName: string,
    emoji: string,
    options: ConfigOption[]
}

export interface ConfigOption {
    name: string,
    prettyName: string,
    options: SubConfigOption[],
    description?: string
    userOnly?: boolean,
    serverOnly?: boolean
}

export interface SubConfigOption {
    name: any;
    emoji: string;
    text: string;
    serverOnly?: boolean;
}

export const SubConfigOptionTRUE: SubConfigOption = {
    name: true,
    emoji: Constants.ON_EMOJI,
    text: "Enabled",
};

export const SubConfigOptionFALSE: SubConfigOption = {
    name: false,
    emoji: Constants.OFF_EMOJI,
    text: "Disabled",
};