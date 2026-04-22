const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Load dotenv only for local development
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (error) {
        // dotenv not installed - continue
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;

// Validation
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN missing!');
    process.exit(1);
}
if (!LOG_CHANNEL_ID) {
    console.error('❌ LOG_CHANNEL_ID missing!');
    process.exit(1);
}
if (!COMMAND_CHANNEL_ID) {
    console.error('❌ COMMAND_CHANNEL_ID missing!');
    process.exit(1);
}

// Help panel image URL
const HELP_IMAGE_URL = 'https://media.discordapp.net/attachments/1462437612647088335/1496532899640377526/image.png';

// Logging function
async function sendLog(message, action, targetUser, reason = 'No reason provided') {
    try {
        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) {
            console.error('❌ Log channel not found!');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle(`🔨 ${action} Executed`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: '👮 Executor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '🎯 Target', value: `${targetUser.user ? targetUser.user.tag : targetUser.tag} (${targetUser.id})`, inline: true },
                { name: '⚡ Action', value: action, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `User ID: ${targetUser.id}` });

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Log error:', error);
    }
}

// Confirmation function
async function sendConfirmation(message, action, targetUser, reason = '') {
    const embed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle(`✅ ${action} Successful`)
        .setDescription(`Successfully ${action.toLowerCase()} <@${targetUser.id}>`)
        .addFields(
            { name: 'Target', value: `${targetUser.user ? targetUser.user.tag : targetUser.tag}`, inline: true },
            { name: 'Moderator', value: message.author.tag, inline: true }
        )
        .setTimestamp();

    if (reason) {
        embed.addFields({ name: 'Reason', value: reason, inline: false });
    }

    await message.reply({ embeds: [embed] });
}

// Error message function
async function sendError(message, errorText) {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription(errorText)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Help panel command
async function showHelpPanel(message) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ Moderation Bot Commands')
        .setDescription('Here are all available moderation commands:')
        .setThumbnail(message.guild.iconURL())
        .setImage(HELP_IMAGE_URL)
        .addFields(
            { name: '🚫 Ban', value: '`!ban <userID> [reason]`\nPermanently bans a user from the server.', inline: false },
            { name: '👢 Kick', value: '`!kick <userID> [reason]`\nKicks a user from the server.', inline: false },
            { name: '⚠️ Warn', value: '`!warn <userID> [reason]`\nIssues a warning to a user.', inline: false },
            { name: '🔇 Timeout', value: '`!timeout <userID> <duration> [reason]`\nTemporarily mutes a user.\nDuration format: `10m`, `1h`, `1d`', inline: false },
            { name: '📋 Help', value: '`!help` or `!panel`\nShows this help panel.', inline: false }
        )
        .setFooter({ text: 'Commands only work in the designated commands channel' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

// Parse duration for timeout (e.g., "10m", "1h", "2d")
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch(unit) {
        case 'm': return value * 60 * 1000; // minutes to ms
        case 'h': return value * 60 * 60 * 1000; // hours to ms
        case 'd': return value * 24 * 60 * 60 * 1000; // days to ms
        default: return null;
    }
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📝 Log Channel: ${LOG_CHANNEL_ID}`);
    console.log(`💬 Command Channel: ${COMMAND_CHANNEL_ID}`);
    console.log(`🛡️ Moderation bot is ready!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if message is in commands channel
    if (message.channel.id !== COMMAND_CHANNEL_ID) {
        // Optional: Delete messages from wrong channel
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            const warnEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ Wrong Channel')
                .setDescription(`Commands only work in <#${COMMAND_CHANNEL_ID}>`)
                .setTimestamp();
            await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
        }
        return;
    }
    
    // Parse command
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // Check permissions helper
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return sendError(message, 'You need moderation permissions to use this command!');
    }
    
    // HELP COMMAND
    if (command === 'help' || command === 'panel') {
        return showHelpPanel(message);
    }
    
    // Helper to get target user
    const targetId = args[0];
    if (!targetId && command !== 'help' && command !== 'panel') {
        return sendError(message, `Please provide a user ID. Usage: \`!${command} <userID> [reason]\``);
    }
    
    let targetUser;
    if (targetId) {
        try {
            targetUser = await message.guild.members.fetch(targetId);
            if (!targetUser) {
                return sendError(message, 'User not found! Make sure the ID is correct.');
            }
        } catch (error) {
            return sendError(message, 'User not found! Make sure the ID is correct.');
        }
    }
    
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    // BAN COMMAND
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendError(message, 'You need the "Ban Members" permission!');
        }
        
        if (!targetUser.bannable) {
            return sendError(message, 'I cannot ban this user! They might have higher permissions.');
        }
        
        try {
            await targetUser.ban({ reason: `${reason} (Banned by ${message.author.tag})` });
            await sendConfirmation(message, 'Ban', targetUser, reason);
            await sendLog(message, 'Ban', targetUser, reason);
        } catch (error) {
            console.error(error);
            return sendError(message, 'Failed to ban user. Check my permissions!');
        }
    }
    
    // KICK COMMAND
    else if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return sendError(message, 'You need the "Kick Members" permission!');
        }
        
        if (!targetUser.kickable) {
            return sendError(message, 'I cannot kick this user! They might have higher permissions.');
        }
        
        try {
            await targetUser.kick(`${reason} (Kicked by ${message.author.tag})`);
            await sendConfirmation(message, 'Kick', targetUser, reason);
            await sendLog(message, 'Kick', targetUser, reason);
        } catch (error) {
            console.error(error);
            return sendError(message, 'Failed to kick user. Check my permissions!');
        }
    }
    
    // WARN COMMAND
    else if (command === 'warn') {
        if (!targetUser.moderatable) {
            return sendError(message, 'I cannot warn this user!');
        }
        
        const warnEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⚠️ Warning')
            .setDescription(`You have been warned in ${message.guild.name}`)
            .addFields(
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp();
        
        try {
            await targetUser.send({ embeds: [warnEmbed] }).catch(() => {});
            await sendConfirmation(message, 'Warning', targetUser, reason);
            await sendLog(message, 'Warning', targetUser, reason);
        } catch (error) {
            console.error(error);
            return sendError(message, 'Failed to warn user.');
        }
    }
    
    // TIMEOUT/MUTE COMMAND
    else if (command === 'timeout' || command === 'mute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return sendError(message, 'You need the "Moderate Members" permission!');
        }
        
        if (!targetUser.moderatable) {
            return sendError(message, 'I cannot timeout this user! They might have higher permissions.');
        }
        
        const durationStr = args[1];
        const reasonStart = durationStr ? 2 : 1;
        const finalReason = args.slice(reasonStart).join(' ') || 'No reason provided';
        
        if (!durationStr) {
            return sendError(message, 'Please provide a duration. Format: `!timeout <userID> <duration> [reason]`\nExamples: `10m`, `1h`, `1d`');
        }
        
        const durationMs = parseDuration(durationStr);
        if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) { // Max 28 days
            return sendError(message, 'Invalid duration! Use format like: `10m`, `1h`, `2d` (max 28 days)');
        }
        
        try {
            await targetUser.timeout(durationMs, `${finalReason} (Timed out by ${message.author.tag})`);
            await sendConfirmation(message, `Timeout (${durationStr})`, targetUser, finalReason);
            await sendLog(message, `Timeout (${durationStr})`, targetUser, finalReason);
        } catch (error) {
            console.error(error);
            return sendError(message, 'Failed to timeout user. Check my permissions!');
        }
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login
client.login(BOT_TOKEN);
