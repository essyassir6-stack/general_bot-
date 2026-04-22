const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Load dotenv only if in development (optional)
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (error) {
        // dotenv not installed or not needed - continue anyway
        console.log('Running without dotenv (production mode or dotenv not installed)');
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Get configuration from environment variables (Railway provides these)
const BOT_TOKEN = process.env.BOT_TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;

// Validate required environment variables
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing! Set it in Railway environment variables.');
    process.exit(1);
}

if (!LOG_CHANNEL_ID) {
    console.error('❌ LOG_CHANNEL_ID is missing! Set it in Railway environment variables.');
    process.exit(1);
}

if (!COMMAND_CHANNEL_ID) {
    console.error('❌ COMMAND_CHANNEL_ID is missing! Set it in Railway environment variables.');
    process.exit(1);
}

// Logging function
async function sendLog(interactionOrMessage, action, targetUser, executor) {
    try {
        const logChannel = interactionOrMessage.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) {
            console.error('Log channel not found! Make sure LOG_CHANNEL_ID is correct.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`🔨 ${action} Action`)
            .setDescription(`An action was performed by a moderator.`)
            .addFields(
                { name: '👮 Executor', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '🎯 Target', value: `${targetUser.tag || targetUser} (${targetUser.id || targetUser})`, inline: true },
                { name: '⚡ Action', value: action, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

// Confirmation message function
async function sendConfirmation(message, action, targetUser) {
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`✅ ${action} Successful`)
        .setDescription(`${action} was executed successfully!`)
        .addFields(
            { name: 'Target', value: `${targetUser.tag || targetUser} (${targetUser.id || targetUser})`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📝 Log channel ID: ${LOG_CHANNEL_ID}`);
    console.log(`💬 Command channel ID: ${COMMAND_CHANNEL_ID}`);
    console.log(`🚀 Bot is ready to moderate!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message is in the commands channel
    if (message.channel.id !== COMMAND_CHANNEL_ID) {
        return; // Silently ignore commands from wrong channels
    }

    // Parse command
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !ban command
    if (command === 'ban') {
        // Check if user has ban permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('❌ You don\'t have permission to ban members!');
        }

        // Get user ID from args
        const targetId = args[0];
        if (!targetId) {
            return message.reply('❌ Please provide a user ID. Usage: `!ban <userID>`');
        }

        // Try to fetch the user
        let targetUser;
        try {
            targetUser = await message.guild.members.fetch(targetId);
            if (!targetUser) {
                return message.reply('❌ User not found! Make sure the ID is correct.');
            }
        } catch (error) {
            return message.reply('❌ User not found! Make sure the ID is correct.');
        }

        // Check if target is bannable
        if (!targetUser.bannable) {
            return message.reply('❌ I cannot ban this user! They might have higher permissions than me.');
        }

        // Confirm before banning
        try {
            await targetUser.ban({ reason: `Banned by ${message.author.tag}` });
            
            // Send confirmation
            await sendConfirmation(message, 'Ban', targetUser.user);
            
            // Send log
            await sendLog(message, 'Ban', targetUser.user, message.author);
        } catch (error) {
            console.error('Ban error:', error);
            return message.reply('❌ Failed to ban the user. Check my permissions!');
        }
    }
});

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login with token from environment variables
client.login(BOT_TOKEN);
