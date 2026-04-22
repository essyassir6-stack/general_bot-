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
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;

// Validation
if (!BOT_TOKEN || !LOG_CHANNEL_ID || !COMMAND_CHANNEL_ID || !MOD_ROLE_ID) {
    console.error('❌ Missing environment variables! Check Railway variables.');
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

// Helper Functions
async function sendLog(message, action, targetUser, reason = 'No reason') {
    try {
        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle(`🔨 ${action}`)
            .addFields(
                { name: '👮 Executor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '🎯 Target', value: `${targetUser.user ? targetUser.user.tag : targetUser.tag} (${targetUser.id})`, inline: true },
                { name: '⚡ Action', value: action, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
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
        .setDescription(`Successfully ${action.toLowerCase()} <@${targetUser.id}>`)
        .addFields(
            { name: 'Target', value: targetUser.user ? targetUser.user.tag : targetUser.tag, inline: true },
            { name: 'Moderator', value: message.author.tag, inline: true }
        );
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
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return member.roles.cache.has(MOD_ROLE_ID);
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

// Help Command (shows all commands)
async function showHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🛡️ Moderation Bot - Help Panel')
        .setDescription('Here are all available commands:')
        .setThumbnail(message.guild.iconURL())
        .addFields(
            { name: '🛠️ MODERATION (8 commands)', value: '```\n' +
                '!ban <userID> [reason] - Permanently ban a user\n' +
                '!kick <userID> [reason] - Kick a user from server\n' +
                '!mute <userID> <time> [reason] - Mute user (10m, 1h, 1d)\n' +
                '!unmute <userID> - Remove timeout from user\n' +
                '!warn <userID> [reason] - Send warning to user\n' +
                '!clear <amount> - Delete messages (1-100)\n' +
                '!timeout <userID> <time> [reason] - Timeout user\n' +
                '!softban <userID> [reason] - Ban and unban to clear messages\n' +
                '```', inline: false },
            { name: '🔧 UTILITY (5 commands)', value: '```\n' +
                '!avatar [userID] - Show user avatar\n' +
                '!serverinfo - Show server information\n' +
                '!userinfo [userID] - Show user information\n' +
                '!ping - Check bot latency\n' +
                '!botinfo - Show bot information\n' +
                '```', inline: false },
            { name: '🎭 ROLES (4 commands)', value: '```\n' +
                '!addrole <userID> <roleID> - Add role to user\n' +
                '!removerole <userID> <roleID> - Remove role from user\n' +
                '!roles [userID] - Show user roles\n' +
                '!createrole <name> <color> - Create new role\n' +
                '```', inline: false },
            { name: '🎉 FUN (4 commands)', value: '```\n' +
                '!hello - Say hello to bot\n' +
                '!pingpong - Play ping pong\n' +
                '!8ball <question> - Ask the magic 8ball\n' +
                '!hug [userID] - Hug someone\n' +
                '```', inline: false }
        )
        .setFooter({ text: '⚠️ Moderation commands require mod role | Commands only work in #mod-commands' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📝 Log Channel: ${LOG_CHANNEL_ID}`);
    console.log(`💬 Command Channel: ${COMMAND_CHANNEL_ID}`);
    console.log(`👮 Mod Role ID: ${MOD_ROLE_ID}`);
    console.log(`🚀 Bot is ready with 20+ commands!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;
    
    // Command channel check
    if (message.channel.id !== COMMAND_CHANNEL_ID) {
        await message.delete().catch(() => {});
        const warnEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('⚠️ Wrong Channel')
            .setDescription(`Commands only work in <#${COMMAND_CHANNEL_ID}>`)
            .setTimestamp();
        await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
        return;
    }
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // HELP COMMAND (no mod permission needed)
    if (command === 'help') {
        return showHelp(message);
    }
    
    // Check mod permission for moderation commands
    const modCommands = ['ban', 'kick', 'mute', 'unmute', 'warn', 'clear', 'timeout', 'softban', 'addrole', 'removerole'];
    if (modCommands.includes(command) && !hasModPermission(message.member)) {
        return sendError(message, `You need the <@&${MOD_ROLE_ID}> role to use this command!`);
    }
    
    // Helper to get target user
    const getTarget = async (id) => {
        try {
            return await message.guild.members.fetch(id);
        } catch (error) {
            return null;
        }
    };
    
    // ==================== MODERATION COMMANDS ====================
    
    // BAN COMMAND
    if (command === 'ban') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!ban <userID> [reason]`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.bannable) return sendError(message, 'I cannot ban this user!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.ban({ reason: `${reason} (Banned by ${message.author.tag})` });
        await sendConfirm(message, 'Ban', target, reason);
        await sendLog(message, 'Ban', target, reason);
    }
    
    // KICK COMMAND
    else if (command === 'kick') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!kick <userID> [reason]`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.kickable) return sendError(message, 'I cannot kick this user!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.kick(`${reason} (Kicked by ${message.author.tag})`);
        await sendConfirm(message, 'Kick', target, reason);
        await sendLog(message, 'Kick', target, reason);
    }
    
    // MUTE/TIMEOUT COMMAND
    else if (command === 'mute' || command === 'timeout') {
        const targetId = args[0];
        const durationStr = args[1];
        if (!targetId || !durationStr) return sendError(message, 'Usage: `!mute <userID> <time> [reason]`\nTime formats: 10m, 1h, 1d');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.moderatable) return sendError(message, 'I cannot mute this user!');
        
        const durationMs = parseDuration(durationStr);
        if (!durationMs) return sendError(message, 'Invalid time format! Use: 10m, 1h, 1d');
        if (durationMs > 28 * 24 * 60 * 60 * 1000) return sendError(message, 'Mute cannot exceed 28 days!');
        
        const reason = args.slice(2).join(' ') || 'No reason';
        await target.timeout(durationMs, `${reason} (Timed out by ${message.author.tag})`);
        await sendConfirm(message, `Mute (${durationStr})`, target, reason);
        await sendLog(message, `Mute (${durationStr})`, target, reason);
    }
    
    // UNMUTE COMMAND
    else if (command === 'unmute') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!unmute <userID>`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.moderatable) return sendError(message, 'I cannot unmute this user!');
        
        await target.timeout(null);
        await sendConfirm(message, 'Unmute', target);
        await sendLog(message, 'Unmute', target);
    }
    
    // WARN COMMAND
    else if (command === 'warn') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!warn <userID> [reason]`');
        
        const target = await getTarget(targetId);
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
    
    // CLEAR COMMAND
    else if (command === 'clear') {
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) return sendError(message, 'Usage: `!clear <1-100>`');
        
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
    
    // SOFTBAN COMMAND
    else if (command === 'softban') {
        const targetId = args[0];
        if (!targetId) return sendError(message, 'Usage: `!softban <userID> [reason]`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        if (!target.bannable) return sendError(message, 'I cannot ban this user!');
        
        const reason = args.slice(1).join(' ') || 'No reason';
        await target.ban({ reason: `${reason} (Softbanned by ${message.author.tag})`, deleteMessageSeconds: 86400 });
        await target.unban(targetId, 'Softban completed');
        await sendConfirm(message, 'Softban', target, reason);
        await sendLog(message, 'Softban', target, reason);
    }
    
    // ==================== UTILITY COMMANDS ====================
    
    // AVATAR COMMAND
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
    
    // SERVERINFO COMMAND
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
    
    // USERINFO COMMAND
    else if (command === 'userinfo') {
        const targetId = args[0];
        let member = message.member;
        if (targetId) {
            const target = await getTarget(targetId);
            if (target) member = target;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(member.user.tag)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '🆔 ID', value: member.id, inline: true },
                { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '📅 Joined Discord', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // PING COMMAND
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
    
    // BOTINFO COMMAND
    else if (command === 'botinfo') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Bot Information')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Name', value: client.user.tag, inline: true },
                { name: 'Commands', value: '20+', inline: true },
                { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Uptime', value: `<t:${Math.floor(Date.now() / 1000 - process.uptime())}:R>`, inline: true }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // ==================== ROLE COMMANDS ====================
    
    // ADDROLE COMMAND
    else if (command === 'addrole') {
        const targetId = args[0];
        const roleId = args[1];
        if (!targetId || !roleId) return sendError(message, 'Usage: `!addrole <userID> <roleID>`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        
        const role = message.guild.roles.cache.get(roleId);
        if (!role) return sendError(message, 'Role not found!');
        if (!role.editable) return sendError(message, 'I cannot assign this role!');
        
        await target.roles.add(role);
        await sendConfirm(message, `Added role ${role.name}`, target);
        await sendLog(message, `Add Role (${role.name})`, target);
    }
    
    // REMOVEROLE COMMAND
    else if (command === 'removerole') {
        const targetId = args[0];
        const roleId = args[1];
        if (!targetId || !roleId) return sendError(message, 'Usage: `!removerole <userID> <roleID>`');
        
        const target = await getTarget(targetId);
        if (!target) return sendError(message, 'User not found!');
        
        const role = message.guild.roles.cache.get(roleId);
        if (!role) return sendError(message, 'Role not found!');
        if (!role.editable) return sendError(message, 'I cannot remove this role!');
        
        await target.roles.remove(role);
        await sendConfirm(message, `Removed role ${role.name}`, target);
        await sendLog(message, `Remove Role (${role.name})`, target);
    }
    
    // ROLES COMMAND
    else if (command === 'roles') {
        const targetId = args[0];
        let member = message.member;
        if (targetId) {
            const target = await getTarget(targetId);
            if (target) member = target;
        }
        
        const roles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => `${r}`).join(', ') || 'No roles';
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${member.user.tag}'s Roles`)
            .setDescription(roles)
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // CREATEROLE COMMAND
    else if (command === 'createrole') {
        const roleName = args[0];
        const color = args[1] || '#99AAB5';
        if (!roleName) return sendError(message, 'Usage: `!createrole <name> [color]`');
        
        const role = await message.guild.roles.create({
            name: roleName,
            color: color,
            reason: `Created by ${message.author.tag}`
        });
        
        await sendConfirm(message, `Created role ${role.name}`, { id: 'N/A', tag: role.name });
    }
    
    // ==================== FUN COMMANDS ====================
    
    // HELLO COMMAND
    else if (command === 'hello') {
        const responses = ['Hey there! 👋', 'Hello! 😊', 'Hi! How are you?', 'Greetings! 🌟'];
        const random = responses[Math.floor(Math.random() * responses.length)];
        await message.reply(`${random} ${message.author.username}!`);
    }
    
    // PINGPONG COMMAND
    else if (command === 'pingpong') {
        await message.reply('Pong! 🏓');
    }
    
    // 8BALL COMMAND
    else if (command === '8ball') {
        const question = args.join(' ');
        if (!question) return sendError(message, 'Ask a question! Usage: `!8ball <question>`');
        
        const answers = [
            'Yes!', 'No.', 'Maybe...', 'Definitely!', 'Absolutely not!',
            'Ask again later.', 'Yes, but be careful.', 'No, and never.'
        ];
        const random = answers[Math.floor(Math.random() * answers.length)];
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎱 Magic 8Ball')
            .addFields(
                { name: 'Question', value: question, inline: false },
                { name: 'Answer', value: random, inline: false }
            )
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
    
    // HUG COMMAND
    else if (command === 'hug') {
        const targetId = args[0];
        let target = message.author;
        if (targetId) {
            const found = await getTarget(targetId);
            if (found) target = found.user;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setDescription(`${message.author} hugs ${target} 🤗`)
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(BOT_TOKEN);
