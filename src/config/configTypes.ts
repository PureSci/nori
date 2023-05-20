import { InteractionReplyOptions, MessageEditOptions, MessageReplyOptions } from "discord.js";
import Constants from "../utils/Constants.js";

export let configTypes: ConfigType[] = [];

export let configObjects: {
    [key: string]: (guildId: string, userId: string, isServer?: boolean) => Promise<MessageReplyOptions & InteractionReplyOptions & MessageEditOptions>
} = {};

export interface ConfigType {
    name: string,
    prettyName: string,
    emoji: string,
    server_only: boolean,
    options: ConfigOption[]
}

export interface ConfigOption {
    name: string,
    prettyName: string,
    options: SubConfigOption[],
    description?: string
}

export interface SubConfigOption {
    name: any;
    emoji: string;
    text: string;
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