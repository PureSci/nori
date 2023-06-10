import { Message } from "discord.js";
import { getUserConfig } from "../utils/databaseHandler.js";
import { normalGlow, superGlow } from "../operations/glowIndicators.js";

export function filter(message: Message): boolean {
    return (message.embeds?.[0]?.title == "SOFI: GLOW" || message.embeds?.[0]?.title == "SOFI: SUPER GLOW") ?? false;
}

export async function run(message: Message) {
    if (message.components[0].components[0].disabled) return;
    let referenceMessage = await message.fetchReference();
    let config;
    if (referenceMessage) config = await getUserConfig("utils.glowIndicators", referenceMessage.author.id, message.guildId);
    else return;
    if (!config.data) return;
    if (message.embeds[0].title == "SOFI: GLOW") {
        const color = message.embeds[0].hexColor;
        if (color == "#ec91c8" || !color) return;
        message.reply(normalGlow(color, message.embeds[0].color!));
    } else {
        message.reply(
            await superGlow(
                referenceMessage.author.id, // owner Id
                message.embeds[0].description?.split("Code: `#")[1].split("`")[0]!, // viewCode
                message.embeds[0].color!
            )
        );
    }
}