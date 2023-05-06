import mongoose, { Schema } from "mongoose";
import settings from "../../settings.json" assert {type: "json"};
import merge from "lodash.merge";

await mongoose.connect(settings.db_url);

export const UserConfig = mongoose.model("user_config", new Schema({
    _id: String,
    analysis: {
        enabled: Boolean
    }
}));

export const ServerConfig = mongoose.model("server_config", new Schema({
    _id: String,
    analysis: {
        enabled: { type: Boolean, default: true },
        test: { type: Boolean, default: true }
    }
}));

await ServerConfig.findByIdAndDelete("defaults").exec();
await ServerConfig.findByIdAndUpdate("defaults", {}, { upsert: true }).exec();

export async function get_user_config(user_id: string, guild_id: string, query: string) {
    let user_config_response: any = await UserConfig.findById(user_id, query === "_all" ? null : query).lean().exec();
    if (!user_config_response) {
        return get_server_config(guild_id, query);
    }
    if (query == "_all") {
        return complete_nonexistend(user_config_response, guild_id, query);
    } else {
        if (!user_config_response[query.split(".")[0]]) {
            user_config_response = await ServerConfig.findById("defaults", query).lean().exec()!;
        }
        query.split(".").forEach(key => {
            user_config_response = user_config_response[key];
        });
        return complete_nonexistend(user_config_response, guild_id, query);
    }
}

export async function get_server_config(guild_id: string, query: string) {
    let server_config_response: any;
    if (query == "_all") {
        server_config_response = await ServerConfig.findById(guild_id).lean().exec() ?? await ServerConfig.findById("defaults").lean().exec()!;
        return convert_defaulted(server_config_response, true);
    } else {
        server_config_response = await ServerConfig.findById(guild_id, query).lean().exec() ?? await ServerConfig.findById("defaults", query).lean().exec()!;
        if (!server_config_response[query.split(".")[0]]) {
            server_config_response = await ServerConfig.findById("defaults", query).lean().exec()!;
        }
        query.split(".").forEach(key => {
            server_config_response = server_config_response[key];
        });
        return convert_defaulted(server_config_response, true);
    }
}

async function complete_nonexistend(user_config_response: any, guild_id: string, query: string) {
    let server_config_response = get_server_config(guild_id, query);
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