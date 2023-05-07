import mongoose, { Schema } from "mongoose";
import settings from "../../settings.json" assert {type: "json"};
import merge from "lodash.merge";

await mongoose.connect(settings.db_url);

export const UserConfig = mongoose.model("user_config", new Schema({
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

let server_config_object: any = {
    analysis: {
        enabled: { type: Boolean, default: true },
        format: { type: String, default: "`1]` • :heart: `{wl1}` • `ɢ{gen1}` • **{cardname1}** • {cardseries1}\n{copy1?2}\n{copy1?3}" }
    },
    reminders: {
        480000: { type: Boolean, default: true },
        240000: { type: Boolean, default: false }
    }
};

export const ServerConfig = mongoose.model("server_config", new Schema({
    _id: String,
    ...server_config_object
}));

let server_config_defaults = convert_server_defaults(server_config_object);

export async function get_user_config(query: string, user_id: string, guild_id: string | null) {
    let user_config_response: any = await UserConfig.findById(user_id, query === "_all" ? null : query).lean().exec();
    if (!user_config_response) {
        return get_server_config(query, guild_id);
    }
    if (query == "_all") {
        return complete_nonexistend(user_config_response, query, guild_id);
    } else {
        if (!user_config_response[query.split(".")[0]]) {
            user_config_response = get_server_config(query, guild_id);
        }
        query.split(".").forEach(key => {
            user_config_response = user_config_response[key];
        });
        return complete_nonexistend(user_config_response, query, guild_id);
    }
}

export async function get_server_config(query: string, guild_id: string | null) {
    let server_config_response: any;
    if (query == "_all") {
        server_config_response = await ServerConfig.findById(guild_id).lean().exec() ?? server_config_defaults;
        return convert_defaulted(server_config_response, true);
    } else {
        server_config_response = await ServerConfig.findById(guild_id, query).lean().exec() ?? server_config_defaults;
        if (!server_config_response[query.split(".")[0]]) {
            server_config_response = server_config_defaults;
        }
        query.split(".").forEach(key => {
            server_config_response = server_config_response[key];
        });
        return convert_defaulted(server_config_response, true);
    }
}

async function complete_nonexistend(user_config_response: any, query: string, guild_id: string | null) {
    let server_config_response = get_server_config(query, guild_id);
    return convert_defaulted(merge(server_config_response, user_config_response), false);
}

function convert_defaulted(obj: any, server_default: boolean): any {
    const converted: any = {};
    if (typeof obj !== "object") {
        return {
            data: obj,
            server_default: server_default
        };
    }
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
            if ((value as any).data || (value as any).server_default) converted[key] = value
            else converted[key] = convert_defaulted(value, server_default);
        } else {
            converted[key] = {
                data: value,
                server_default: server_default
            };
        }
    }
    return converted;
}

function convert_server_defaults(obj: any) {
    let converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object") {
            if ((value as any).type && (value as any).default) {
                converted[key] = (value as any).default;
            } else converted[key] = convert_server_defaults(value);
        }
    }
    return converted;
}