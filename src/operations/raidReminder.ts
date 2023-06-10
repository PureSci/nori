import { Message } from "discord.js";
import { UserConfig } from "../utils/databaseHandler.js";
import { client } from "../index.js";

export function filter(message: Message): boolean {
    return message.embeds?.[0]?.title?.startsWith("SOFI: GUILD RAID") ?? false;
}

let currentRaidCooldown: {
    timeout: NodeJS.Timeout,
    duration: number
} | null = null;

export async function run(message: Message) {
    let endsTimestamp = parseInt(message.embeds[0].title!.split("<t:")[1].split(":R>")[0]);
    if (!currentRaidCooldown) {
        console.log(((endsTimestamp + 20) * 1000) - Date.now());
        setTout(endsTimestamp);
    } else {
        if (currentRaidCooldown.duration == endsTimestamp) return;
        clearTimeout(currentRaidCooldown.timeout);
        setTout(endsTimestamp);
    }
}

function setTout(endsTimestamp: number) {
    currentRaidCooldown = {
        timeout: setTimeout(() => newRaid(), ((endsTimestamp + 20) * 1000) - Date.now()),
        duration: endsTimestamp
    }
}

async function newRaid() {
    setTout(Math.round(Date.now() / 1000) + 7220);
    const users = await UserConfig.find({
        "reminders.raid": "dm"
    }, "_id").exec();
    users.forEach(async user => {
        client.users.send(user._id, {
            content: "👹 New Raid started!"
        }).catch(_ => null);
    });
}