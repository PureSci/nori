import mongoose, { Schema } from "mongoose";
import settings from "../../settings.json" assert {type: "json"};
await mongoose.connect(settings.db_url);

export const UserConfig = mongoose.model("user_config", new Schema({
    _id: String,
    analysis: {
        enabled: Boolean,
    }
}));

export const ServerConfig = mongoose.model("server_config", new Schema({
    _id: String,
    analysis: {
        enabled: { type: Boolean, default: true }
    }
}));

await ServerConfig.updateOne({ _id: "defaults" }, {}, { upsert: true }).exec();

export async function get_user_config(user_id: string, guild_id: string, query: string) {
    let user_config_response;
    if (query == "_all") {
        user_config_response = await UserConfig.findById(user_id).exec();
        if (!user_config_response) {
            return get_server_config(guild_id, query);
        }
    }
}

export async function get_server_config(guild_id: string | undefined | null, query: string) {
    let server_config_response;
    if (query == "_all") {
        server_config_response = await ServerConfig.findById(guild_id).exec() ?? await ServerConfig.findById("defaults").exec();

    }
}