import { Message, parseEmoji } from "discord.js";
import { getUserConfig } from "../utils/databaseHandler.js";
import { awaitGlowIndicatorEmoji, handleGlowIndicator } from "../operations/glowIndicators.js";
import Constants from "../utils/Constants.js";

const glowIndicatorEmoji = parseEmoji(Constants.GLOWINFO_EMOJI)!;

export function filter(message: Message): boolean {
    return message.embeds?.[0]?.footer?.text.startsWith("Glow:") ?? false;
}

export async function run(message: Message) {
    if (message.components[0].components[0].disabled || message.embeds[0].description == "Cancelled") return;
    let referenceMessage = await message.fetchReference();
    let config;
    if (referenceMessage) config = await getUserConfig("utils.glowIndicators", referenceMessage.author.id, message.guildId);
    else return;
    if (!config.data) return;
    if (config.data == "auto") {
        handleGlowIndicator(message, referenceMessage.author.id);
    } else {
        // @ts-ignore
        message.react(glowIndicatorEmoji);
        awaitGlowIndicatorEmoji(message, referenceMessage.author.id);
    }
}