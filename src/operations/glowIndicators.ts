import { AttachmentBuilder, Message } from "discord.js";
import { getServerConfig, getUserConfig } from "../utils/databaseHandler.js";
import fetch from "node-fetch";
import { createCanvas, loadImage } from "canvas";

export function filter(message: Message): boolean {
    return (message.embeds?.[0]?.title == "SOFI: GLOW" || message.embeds?.[0]?.description?.split("\n")?.pop()?.startsWith("**Owned By:")) ?? false;
}

export async function run(message: Message) {
    let referenceMessage = await message.fetchReference();
    let config;
    if (referenceMessage) config = await getUserConfig("utils.glowIndicators", referenceMessage.author.id, message.guildId);
    else config = await getServerConfig("utils.glowIndicators", message.guildId);
    if (!config.data) return;
    const rows = message.embeds?.[0]?.description?.split("\n");
    if (rows?.find(x => x.startsWith(`\`Type:`))?.includes("Super")) {
        message.reply(
            await superGlow(
                rows[4].split("<@")[1].split(">")[0], // owner Id
                rows[1].split("#")[1].split("`")[0], // viewCode
                message.embeds[0].color!
            )
        );
    }
    else {
        const color = message.embeds[0].hexColor;
        if (color == "#ec91c8" || !color) return;
        message.reply(normalGlow(color, message.embeds[0].color!));
    }
}

export function normalGlow(color: string, embedColor: number) {
    color = processColor(color);
    return {
        embeds: [{
            title: "Glow Indicator",
            description: getColorString(color),
            color: embedColor,
            thumbnail: {
                url: `https://www.colorhexa.com/${color.replace("#", "")}.png`
            },
            footer: {
                text: "Use /config to turn glow indicators off"
            }
        }]
    };
}

export async function superGlow(owner: string, viewcode: string, embedColor: number) {
    const glow = ((await (await fetch(`https://api.sofi.gg/glows/${owner}`, {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-GB,en;q=0.8",
            "Referer": "https://sofi.gg/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    })).json()) as any).glows.find((glow: any) => glow.viewcode == viewcode);
    const color1 = processColor(glow.code);
    const color2 = processColor(glow.code2);
    const canvas = createCanvas(150, 200);
    const context = canvas.getContext('2d');
    const image = await loadImage(`https://www.colorhexa.com/${color1.replace("#", "")}.png`);
    context.drawImage(image, 0, 0);
    context.fillStyle = color2;
    context.fillRect(75, 0, 75, 200);
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "superglow.png" });
    return {
        embeds: [{
            title: "Glow Indicator",
            fields: [
                {
                    name: "Color One",
                    value: getColorString(color1),
                    inline: true
                },
                {
                    name: "Color Two",
                    value: getColorString(color2),
                    inline: true
                }
            ],
            color: embedColor,
            thumbnail: {
                url: `attachment://${attachment.name}`
            },
            footer: {
                text: "Use /config to turn glow indicators off"
            }
        }],
        files: [attachment]
    };
}

function processColor(color: string) {
    if (color.length == 5) color = "0" + color;
    if (color.length == 4) color = "00" + color;
    return color;
}

function getColorString(color: string) {
    return `**Hex:** \`${color}\`\n**RGB:** \`${hexToRgb(color).join(", ")}\`\n[More Information](https://www.colorhexa.com/${color.replace("#", "")})`;
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}