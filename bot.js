const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;

if (!BOT_TOKEN || !LOG_CHANNEL_ID || !COMMAND_CHANNEL_ID || !MOD_ROLE_ID) {
    console.error('❌ Missing environment variables!');
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

// ================= LOG =================
async function sendLog(message, action, targetUser, reason = 'No reason') {
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`🔨 ${action}`)
        .addFields(
            { name: 'Executor', value: `${message.author.tag} (${message.author.id})` },
            { name: 'Target', value: `${targetUser.tag || targetUser.user.tag} (${targetUser.id})` },
            { name: 'Reason', value: reason }
        )
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
}

// ================= PERMISSION =================
function hasMod(member) {
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return member.roles.cache.has(MOD_ROLE_ID);
}

// ================= TIME =================
function parseTime(t) {
    const match = t.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const type = match[2];

    if (type === 'm') return num * 60000;
    if (type === 'h') return num * 3600000;
    if (type === 'd') return num * 86400000;
}

// ================= READY =================
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} is online`);
});

// ================= MESSAGE =================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    if (message.channel.id !== COMMAND_CHANNEL_ID) {
        return message.reply(`❌ Commands only in <#${COMMAND_CHANNEL_ID}>`);
    }

    const args = message.content.slice(1).split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ================= HELP =================
    if (cmd === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📜 Commands Panel')
            .setDescription('All commands:')
            .addFields(
                { name: '🛠 Moderation', value: '`!ban !kick !mute !unmute !warn !clear`' },
                { name: '⚙ Utility', value: '`!avatar !server !userinfo !ping`' },
                { name: '🎭 Roles', value: '`!addrole !removerole !roles`' },
                { name: '🎉 Fun', value: '`!hello !8ball !hug`' }
            );

        return message.reply({ embeds: [embed] });
    }

    // ================= MOD CHECK =================
    const modCmds = ['ban','kick','mute','unmute','warn','clear','addrole','removerole'];
    if (modCmds.includes(cmd) && !hasMod(message.member)) {
        return message.reply('❌ You need mod role');
    }

    // ================= BAN =================
    if (cmd === 'ban') {
        const id = args[0];
        if (!id) return message.reply('Usage: !ban ID');

        const member = await message.guild.members.fetch(id).catch(()=>null);
        if (!member) return message.reply('User not found');

        await member.ban();
        sendLog(message, 'BAN', member);
        message.reply('✅ banned');
    }

    // ================= KICK =================
    if (cmd === 'kick') {
        const id = args[0];
        const member = await message.guild.members.fetch(id).catch(()=>null);
        if (!member) return message.reply('User not found');

        await member.kick();
        sendLog(message, 'KICK', member);
        message.reply('✅ kicked');
    }

    // ================= MUTE =================
    if (cmd === 'mute') {
        const id = args[0];
        const time = args[1];

        const member = await message.guild.members.fetch(id).catch(()=>null);
        if (!member) return message.reply('User not found');

        const ms = parseTime(time);
        if (!ms) return message.reply('Use: 10m / 1h');

        await member.timeout(ms);
        sendLog(message, 'MUTE', member);
        message.reply('✅ muted');
    }

    // ================= UNMUTE =================
    if (cmd === 'unmute') {
        const id = args[0];
        const member = await message.guild.members.fetch(id).catch(()=>null);
        if (!member) return message.reply('User not found');

        await member.timeout(null);
        sendLog(message, 'UNMUTE', member);
        message.reply('✅ unmuted');
    }

    // ================= WARN =================
    if (cmd === 'warn') {
        const id = args[0];
        const member = await message.guild.members.fetch(id).catch(()=>null);
        if (!member) return message.reply('User not found');

        member.send('⚠️ You got warned').catch(()=>{});
        sendLog(message, 'WARN', member);
        message.reply('✅ warned');
    }

    // ================= CLEAR =================
    if (cmd === 'clear') {
        const amount = parseInt(args[0]);
        if (!amount) return message.reply('Usage: !clear number');

        await message.channel.bulkDelete(amount);
        message.reply('✅ cleared');
    }

    // ================= AVATAR =================
    if (cmd === 'avatar') {
        const user = message.author;
        return message.reply(user.displayAvatarURL({ size:1024 }));
    }

    // ================= SERVER =================
    if (cmd === 'server') {
        return message.reply(message.guild.name);
    }

    // ================= USERINFO =================
    if (cmd === 'userinfo') {
        return message.reply(message.author.tag);
    }

    // ================= PING =================
    if (cmd === 'ping') {
        return message.reply('🏓 Pong');
    }

    // ================= ROLES =================
    if (cmd === 'addrole') {
        const id = args[0];
        const roleId = args[1];

        const member = await message.guild.members.fetch(id).catch(()=>null);
        const role = message.guild.roles.cache.get(roleId);

        if (!member || !role) return message.reply('Error');

        await member.roles.add(role);
        message.reply('✅ role added');
    }

    if (cmd === 'removerole') {
        const id = args[0];
        const roleId = args[1];

        const member = await message.guild.members.fetch(id).catch(()=>null);
        const role = message.guild.roles.cache.get(roleId);

        if (!member || !role) return message.reply('Error');

        await member.roles.remove(role);
        message.reply('✅ role removed');
    }

    if (cmd === 'roles') {
        const roles = message.member.roles.cache.map(r=>r.name).join(', ');
        message.reply(roles);
    }

    // ================= FUN =================
    if (cmd === 'hello') {
        message.reply('Hello 👋');
    }

    if (cmd === '8ball') {
        const answers = ['Yes','No','Maybe'];
        message.reply(answers[Math.floor(Math.random()*answers.length)]);
    }

    if (cmd === 'hug') {
        message.reply('🤗');
    }
});

client.login(BOT_TOKEN);
