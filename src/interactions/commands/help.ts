import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Message, SlashCommandBuilder, User } from "discord.js";

export const data = {
    "aliases": ["help"],
    "feature": "general"
};

export const register = new SlashCommandBuilder()
    .setName("help")
    .setDMPermission(true)
    .setDescription("Shows the help menu");

export function interactionRun(interaction: ChatInputCommandInteraction) {
    run(interaction, interaction.user);
}

export function messageRun(message: Message) {
    run(message, message.author);
}

async function run(message: Message | ChatInputCommandInteraction, user: User) {
    message.reply({
        embeds: [{
            author: {
                name: "Nori - Help",
                icon_url: user.avatarURL() ?? undefined
            },
            description: "Nori is designed to assist SOFI players for no cost forever and ever without any premium features.",
            fields: [
                {
                    name: "<:line:1071888617913470996> Features",
                    value: "> `Wishlist Analysis` for Drops / Server Drops.\n> `Reminders` for drop / grab."
                },
                {
                    name: "<:line:1071888617913470996> Commands",
                    value: "> `/config`: Config your preferences.\n> `/serverconfig` : Config your default server preferences."
                },
                {
                    name: "<:line:1071888617913470996> Support Me",
                    value: "> Nori is open source! Star me on [GitHub](https://github.com/PureSci/ogonori)\n> Nori is completely free to use! Help me financially by being a patron on [Patreon](https://patreon.com/user?u=87338028)!"
                }
            ],
            color: 15641224
        }],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder({
                    label: "Support",
                    style: ButtonStyle.Link,
                    url: "https://discord.gg/3m2gYq8mUQ"
                })
            )
        ]
    })
}