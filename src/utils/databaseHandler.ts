import mongoose, { Schema } from "mongoose";
import settings from "../../settings.json" assert {type: "json"};
import merge from "lodash.merge";

await mongoose.connect(settings.dbUrl);

export const UserConfig = mongoose.model("userConfig", new Schema({
    _id: String,
    analysis: {
        enabled: Boolean,
        format: String
    },
    reminders: {
        drop: Schema.Types.Mixed,
        grab: Schema.Types.Mixed
    }
}));

const serverConfigObject = {
    analysis: {
        enabled: { type: Boolean, default: true },
        format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}\n{copy1?3}" }
    },
    reminders: {
        drop: { type: Boolean, default: true },
        grab: { type: Boolean, default: false }
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
        }
    }
};

export const ServerConfig = mongoose.model("serverConfig", new Schema({
    _id: String,
    ...serverConfigObject
}));

let serverConfigDefaults = convertServerDefaults(serverConfigObject);

export async function getUserConfig(query: string, userId: string, guildId: string | null) {
    let userConfigResponse: any = await UserConfig.findById(userId, query === "_all" ? null : query).lean().exec();
    if (!userConfigResponse) {
        return getServerConfig(query, guildId);
    }
    if (query == "_all") {
        return completeNonexistend(userConfigResponse, query, guildId);
    } else {
        if (!userConfigResponse[query.split(".")[0]]) {
            userConfigResponse = getServerConfig(query, guildId);
        }
        query.split(".").forEach(key => {
            userConfigResponse = userConfigResponse[key];
        });
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
        if (!serverConfigResponse[query.split(".")[0]]) {
            serverConfigResponse = serverConfigDefaults;
        }
        query.split(".").forEach(key => {
            serverConfigResponse = serverConfigResponse[key];
        });
        return convertDefaulted(serverConfigResponse, true);
    }
}

async function completeNonexistend(userConfigResponse: any, query: string, guildId: string | null) {
    let serverConfigResponse = getServerConfig(query, guildId);
    return convertDefaulted(merge(serverConfigResponse, userConfigResponse), false);
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
            if ((value as any).type && (value as any).default) {
                converted[key] = (value as any).default;
            } else converted[key] = convertServerDefaults(value);
        }
    }
    return converted;
}