const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Load dotenv only for local development
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
    } catch (error) {}
}

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;

// Validation
if (!BOT_TOKEN || !LOG_CHANNEL_ID || !MOD_ROLE_ID) {
    console.error('❌ Missing environment variables!');
    console.error('Required: BOT_TOKEN, LOG_CHANNEL_ID, MOD_ROLE_ID');
    process.exit(1);
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

// ==================== HELPER FUNCTIONS ====================

async function sendLog(message, action, targetUser, reason = 'No reason') {
    try {
        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) {
            console.error('Log channel not found!');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle(`🔨 ${action}`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: '👮 Executor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '🎯 Target', value: targetUser ? `${targetUser.user ? targetUser.user.tag : targetUser.tag} (${targetUser.id})` : 'N/A', inline: true },
                { name: '⚡ Action', value: action, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '📍 Channel', value: `<#${message.channel.id}>`, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Log error:', error);
    }
}

async function sendConfirm(message, action, targetUser, reason = '') {
    const embed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle(`✅ ${action} Successful`)
        .setDescription(`Successfully ${action.toLowerCase()} ${targetUser ? `<@${targetUser.id}>` : ''}`)
        .addFields(
            { name: 'Moderator', value: message.author.tag, inline: true }
        );
    if (targetUser) embed.addFields({ name: 'Target', value: targetUser.user ? targetUser.user.tag : targetUser.tag, inline: true });
    if (reason) embed.addFields({ name: 'Reason', value: reason, inline: false });
    embed.setTimestamp();
    await message.reply({ embeds: [embed] });
}

async function sendError(message, errorText) {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Error')
        .setDescription(errorText)
        .setTimestamp();
    await message.reply({ embeds: [embed] });
}

function hasModPermission(member) {
    // Admin bypass
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    // Check for mod role
    return member.roles.cache.has(MOD_ROLE_ID);
}

function hasPermission(member, permission) {
    return member.permissions.has(permission);
}

function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch(unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

async function getTarget(message, userId) {
    try {
        return await message.guild.members.fetch(userId);
    } catch (error) {
        return null;
    }
}

// ==================== HELP PANEL ====================

async function showHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ Moderation Bot - Help Panel')
        .setDescription('Here are all available commands:')
        .setThumbnail(message.guild.iconURL())
        .addFields(
            { name: '🛠️ MODERATION (7 commands)', value: '```\n' +
                '!ban <userID> [reason] - Permanently ban a user\n' +
                '!kick <userID> [reason] - Kick a user from server\n' +
                '!mute <userID> <time> [reason] - Timeout user (10m, 1h, 1d)\n' +
                '!unmute <userID> [reason] - Remove timeout from user\n' +
                '!timeout <userID> <time> [reason] - Same as mute\n' +
                '!clear <amount> - Delete messages (1-100)\n' +
                '!warn <userID> [reason] - Send warning to user\n' +
                '```', inline: false },
            { name: '🔧 UTILITY (5 commands)', value: '```\n' +
                '!avatar [userID] - Show user avatar\n' +
                '!serverinfo - Show server information\n' +
                '!userinfo [userID] - Show user information\n' +
                '!ping - Check bot latency\n' +
                '!help - Show this help panel\n' +
                '```', inline: false }
        )
        .setFooter({ text: `⚠️ Moderation commands require <@&${MOD_ROLE_ID}> role or Admin permissions` })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

// ==================== BOT READY ====================

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📝 Log Channel: ${LOG_CHANNEL_ID}`);
    console.log(`👮 Mod Role ID: ${MOD_ROLE_ID}`);
    console.log(`🚀 Bot is ready with 12 commands!`);
    console.log(`💬 Commands work in ANY channel`);
});

// ==================== COMMAND HANDLER ====================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // HELP COMMAND (no permission needed)
    if (command === 'help') {
        return showHelp(message);
    }
    
    // Check mod permission for moderation commands
    const modCommands = ['ban', 'kick', 'mute', 'unmute', 'timeout', 'clear', 'warn'];
    if (modCommands.includes(command) && !hasModPermission(message.member)) {
        return sendError(message, `You need the <@&${MOD_ROLE_ID}> role to use this command!`);
    }
    
    // ==================== BAN COMMAND ====================
    if (command === 'ban') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!ban <userID> [reason]`');
        
        if (!hasPermission(message.member, PermissionsBitField.Flags.BanMembers)) {
            return sendError(message, 'You need the "Ban Members" permission!');
        }
        
        const target = await getTarget(message, targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.bannable) return sendError(message, 'I cannot ban this user!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.ban({ reason: `${reason} (Banned by ${message.author.tag})` });
        await sendConfirm(message, 'Ban', target, reason);
        await sendLog(message, 'Ban', target, reason);
    }
    
    // ==================== KICK COMMAND ====================
    else if (command === 'kick') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!kick <userID> [reason]`');
        
        if (!hasPermission(message.member, PermissionsBitField.Flags.KickMembers)) {
            return sendError(message, 'You need the "Kick Members" permission!');
        }
        
        const target = await getTarget(message, targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.kickable) return sendError(message, 'I cannot kick this user!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.kick(`${reason} (Kicked by ${message.author.tag})`);
        await sendConfirm(message, 'Kick', target, reason);
        await sendLog(message, 'Kick', target, reason);
    }
    
    // ==================== MUTE/TIMEOUT COMMAND ====================
    else if (command === 'mute' || command === 'timeout') {
        const targetId = args[0];
        const durationStr = args[1];
        if (!targetId || !durationStr) {
            return sendError(message, 'Usage: `!mute <userID> <time> [reason]`\nTime formats: 10m, 1h, 1d\nExample: `!mute 123456789 10m Spamming`');
        }
        
        if (!hasPermission(message.member, PermissionsBitField.Flags.ModerateMembers)) {
            return sendError(message, 'You need the "Moderate Members" permission!');
        }
        
        const target = await getTarget(message, targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.moderatable) return sendError(message, 'I cannot mute this user!');
        
        const durationMs = parseDuration(durationStr);
        if (!durationMs) return sendError(message, 'Invalid time format! Use: 10m (minutes), 1h (hours), 1d (days)');
        if (durationMs > 28 * 24 * 60 * 60 * 1000) return sendError(message, 'Mute cannot exceed 28 days!');
        
        const reason = args.slice(2).join(' ') || 'No reason';
        await target.timeout(durationMs, `${reason} (Timed out by ${message.author.tag})`);
        await sendConfirm(message, `Mute (${durationStr})`, target, reason);
        await sendLog(message, `Mute (${durationStr})`, target, reason);
    }
    
    // ==================== UNMUTE/UNTIMEOUT COMMAND ====================
    else if (command === 'unmute' || command === 'untimeout') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!unmute <userID> [reason]`');
        
        if (!hasPermission(message.member, PermissionsBitField.Flags.ModerateMembers)) {
            return sendError(message, 'You need the "Moderate Members" permission!');
        }
        
        const target = await getTarget(message, targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.moderatable) return sendError(message, 'I cannot unmute this user!');
        
        if (!target.communicationDisabledUntil) {
            return sendError(message, 'User is not muted!');
        }
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.timeout(null);
        await sendConfirm(message, 'Unmute', target, reason);
        await sendLog(message, 'Unmute', target, reason);
    }
    
    // ==================== CLEAR COMMAND ====================
    else if (command === 'clear') {
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) {
            return sendError(message, 'Usage: `!clear <1-100>`');
        }
        
        if (!hasPermission(message.member, PermissionsBitField.Flags.ManageMessages)) {
            return sendError(message, 'You need the "Manage Messages" permission!');
        }
        
        const deleted = await message.channel.bulkDelete(amount, true);
        const confirmEmbed = new EmbedBuilder()
            .setColor(0x4CAF50)
            .setTitle('✅ Messages Cleared')
            .setDescription(`Deleted ${deleted.size} messages`)
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [confirmEmbed] });
        setTimeout(() => reply.delete(), 3000);
        await sendLog(message, `Clear (${deleted.size} messages)`, { id: 'N/A', tag: 'Channel' });
    }
    
    // ==================== WARN COMMAND ====================
    else if (command === 'warn') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!warn <userID> [reason]`');
        
        const target = await getTarget(message, targetId);
        if (!target) return sendError(message, 'User not found!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        const warnEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⚠️ Warning')
            .setDescription(`You have been warned in ${message.guild.name}`)
            .addFields(
                { name: 'Moderator', value: message.author.tag, inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp();
        
        await target.send({ embeds: [warnEmbed] }).catch(() => {});
        await sendConfirm(message, 'Warning', target, reason);
        await sendLog(message, 'Warning', target, reason);
    }
    
    // ==================== AVATAR COMMAND ====================
    else if (command === 'avatar') {
        const targetId = args[0];
        let user = message.author;
        if (targetId) {
            try {
                user = await client.users.fetch(targetId);
            } catch (error) {}
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${user.tag}'s Avatar`)
            .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // ==================== SERVERINFO COMMAND ====================
    else if (command === 'serverinfo') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // ==================== USERINFO COMMAND ====================
    else if (command === 'userinfo') {
        const targetId = args[0];
        let member = message.member;
        if (targetId) {
            const target = await getTarget(message, targetId);
            if (target) member = target;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(member.user.tag)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: member.id, inline: true },
                { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '📅 Joined Discord', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔇 Timed out until', value: member.communicationDisabledUntil ? `<t:${Math.floor(member.communicationDisabledUntil / 1000)}:R>` : 'Not timed out', inline: false }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // ==================== PING COMMAND ====================
    else if (command === 'ping') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latency', value: `${Date.now() - message.createdTimestamp}ms`, inline: true },
                { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
});

// ==================== ERROR HANDLING ====================

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// ==================== BOT LOGIN ====================

client.login(BOT_TOKEN);
