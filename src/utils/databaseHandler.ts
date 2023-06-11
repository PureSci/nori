import mongoose, { Schema } from "mongoose";
import settings from "../../settings.json" assert {type: "json"};
import merge from "lodash.merge";

await mongoose.connect(settings.dbUrl);

export const UserConfig = mongoose.model("userConfig", new Schema({
    _id: String,
    analysis: {
        enabled: Boolean,
        mention: Boolean,
        format: String,
        preset: String,
        presets: {
            standart: {
                showNumbers: Boolean,
                showGen: Boolean,
                showSeries: Boolean
            },
            custom: {
                format: String
            }
        }
    },
    reminders: {
        drop: Schema.Types.Mixed,
        grab: Schema.Types.Mixed,
        raid: Schema.Types.Mixed
    },
    utils: {
        glowIndicators: Schema.Types.Mixed
    }
}));

const serverConfigObject = {
    analysis: {
        enabled: { type: Boolean, default: true },
        mention: { type: Boolean, default: true },
        format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}\n{copy1?3}" },
        preset: { type: String, default: "standart" },
        presets: {
            standart: {
                showNumbers: { type: Boolean, default: true },
                showGen: { type: Boolean, default: true },
                showSeries: { type: Boolean, default: true }
            },
            custom: {
                format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}\n{copy1?3}" }
            }
        }
    },
    utils: {
        deleteMessage: { type: Boolean, default: false },
        glowIndicators: { type: Schema.Types.Mixed, default: true }
    },
    reminders: {
        drop: { type: Schema.Types.Mixed, default: true },
        grab: { type: Schema.Types.Mixed, default: false },
        raid: { type: Schema.Types.Mixed, default: false }
    },
    serverDrops: {
        captcha: {
            enabled: { type: Boolean, default: true },
            format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}" }
        },
        series: {
            one: {
                enabled: { type: Boolean, default: true },
                format: { type: String, default: "`1]` • :heart: `{wl1}` • {cardseries1}\n{copy1?2}\n{copy1?3}" }
            },
            two: {
                enabled: { type: Boolean, default: true },
                format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}" }
            }
        },
        minigame: {
            enabled: { type: Boolean, default: true },
            format: { type: String, default: "`1]` • :heart: `{wl1}` • **{cardname1}** • {cardseries1}" }
        }
    }
};

export const ServerConfig = mongoose.model("serverConfig", new Schema({
    _id: String,
    ...serverConfigObject
}));

let serverConfigDefaults = convertServerDefaults(serverConfigObject);

export async function setData(id: string, query: string, data: any, isServer: boolean, operation?: string) {
    // @ts-ignore
    await (isServer ? ServerConfig : UserConfig).findByIdAndUpdate(id, {
        [operation ?? "$set"]: {
            [query]: data
        }
    }, { upsert: true }).exec();
}

export async function getUserConfig(query: string, userId: string, guildId: string | null, isServer: boolean = false) {
    if (isServer) return await getServerConfig(query, guildId);
    let userConfigResponse: any = await UserConfig.findById(userId, query === "_all" ? null : query).lean().exec();
    if (userConfigResponse == null) {
        return getServerConfig(query, guildId);
    }
    if (query == "_all") {
        return completeNonexistend(userConfigResponse, query, guildId);
    } else {
        if (userConfigResponse[query.split(".")[0]] == null) {
            userConfigResponse = getServerConfig(query, guildId);
        }
        query.split(".").forEach(key => {
            userConfigResponse = userConfigResponse?.[key];
        });
        if (userConfigResponse == null) return getServerConfig(query, guildId);
        return completeNonexistend(userConfigResponse, query, guildId);
    }
}

export async function getServerConfig(query: string, guildId: string | null) {
    let serverConfigResponse: any;
    if (query == "_all") {
        serverConfigResponse = await ServerConfig.findById(guildId).lean().exec() ?? serverConfigDefaults;
        return convertDefaulted(serverConfigResponse, true);
    } else {
        serverConfigResponse = await ServerConfig.findById(guildId, query).lean().exec() ?? serverConfigDefaults;
        serverConfigResponse = sServer(serverConfigResponse, query);
        return merge(convertDefaulted(sServer(serverConfigDefaults, query), true), convertDefaulted(serverConfigResponse, true));
    }
}

function sServer(serverConfigResponse: any, query: string) {
    if (serverConfigResponse[query.split(".")[0]] == null) {
        serverConfigResponse = serverConfigDefaults;
    }
    query.split(".").forEach(key => {
        serverConfigResponse = serverConfigResponse[key];
    });
    return serverConfigResponse;
}

async function completeNonexistend(userConfigResponse: any, query: string, guildId: string | null) {
    let serverConfigResponse = await getServerConfig(query, guildId);
    return merge(serverConfigResponse, convertDefaulted(userConfigResponse, false));
}

function convertDefaulted(obj: any, serverDefault: boolean): any {
    const converted: any = {};
    if (typeof obj !== "object") {
        return {
            data: obj,
            serverDefault: serverDefault
        };
    }
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
            if ((value as any).data || (value as any).serverDefault) converted[key] = value
            else converted[key] = convertDefaulted(value, serverDefault);
        } else {
            converted[key] = {
                data: value,
                serverDefault: serverDefault
            };
        }
    }
    return converted;
}

function convertServerDefaults(obj: any) {
    let converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object") {
            if ((value as any).type && (value as any).default !== (undefined || null)) {
                converted[key] = (value as any).default;
            } else converted[key] = convertServerDefaults(value);
        }
    }
    return converted;
}