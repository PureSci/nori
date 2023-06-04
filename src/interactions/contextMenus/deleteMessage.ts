import { ApplicationCommandType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction, TextChannel } from "discord.js";
import Constants from "../../utils/Constants.js";
import { getUserConfig } from "../../utils/databaseHandler.js";

export const register = new ContextMenuCommandBuilder().setName("Delete Message").setType(ApplicationCommandType.Message);

export const run = async (interaction: MessageContextMenuCommandInteraction) => {
    const data = await getUserConfig("utils.deleteMessage", interaction.user.id, interaction.guildId, true);
    if (!data.data) return interaction.reply({
        ephemeral: true,
        content: "This feature is disabled in this server."
    }).catch(_ => null);
    const perms = interaction.guild?.members.me?.permissionsIn((interaction.channel as TextChannel));
    if (!perms?.has("ManageMessages")) return interaction.reply({
        ephemeral: true,
        content: "Nori has no permission to delete messages. Please contact a server admin."
    }).catch(_ => null);
    if (interaction.targetMessage?.author?.id !== Constants.SOFI_ID) return interaction.reply({
        ephemeral: true,
        content: "This feature can only be used on Sofi's messages."
    }).catch(_ => null);
    const reference = await interaction.targetMessage.fetchReference().catch(_ => null);
    if (!reference) {
        if (interaction.targetMessage.embeds?.[0]?.author?.name.includes("'s Inventory") && interaction.targetMessage.embeds?.[0]?.author?.iconURL == interaction.user.avatarURL()) {
            return deleteMessage(interaction);
        }
        return interaction.reply({
            ephemeral: true,
            content: "I can't be sure who is the owner of this message... Please do not delete your message before using this feature next time if you did so. It could also be because Nori can't see the channel."
        }).catch(_ => null);
    }
    if (reference.author.id !== interaction.user.id) return interaction.reply({
        ephemeral: true,
        content: "This feature can only be used on your own Sofi messages."
    }).catch(_ => null);
    deleteMessage(interaction);
}

function deleteMessage(interaction: MessageContextMenuCommandInteraction) {
    if (interaction.targetMessage.deletable) interaction.targetMessage.delete().then(_ => interaction.reply({
        ephemeral: true,
        content: "Done!"
    })).catch(_ => {
        return interaction.reply({
            ephemeral: true,
            content: "An error occured.."
        });
    }).catch(_ => null);
    else return interaction.reply({
        ephemeral: true,
        content: "The message is somehow not deletable."
    }).catch(_ => null);
}