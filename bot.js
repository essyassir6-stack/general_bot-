const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  EmbedBuilder 
} = require("discord.js");

require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = "!";

const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const MOD_ROLE_ID = process.env.MOD_ROLE_ID;

function hasPerm(member) {
  return member.roles.cache.has(MOD_ROLE_ID);
}

async function sendLog(guild, msg) {
  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (channel) channel.send(msg);
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== COMMAND_CHANNEL_ID) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (!hasPerm(message.member)) {
    return message.reply("❌ You don't have permission");
  }

  // ================= BAN =================
  if (cmd === "ban") {
    const user = args[0];
    if (!user) return message.reply("Usage: !ban <userID>");

    const member = await message.guild.members.fetch(user).catch(() => null);
    if (!member) return message.reply("User not found");

    await member.ban();
    message.reply(`✅ Banned ${member.user.tag}`);

    sendLog(message.guild, `🔨 ${message.author.tag} banned ${member.user.tag}`);
  }

  // ================= KICK =================
  if (cmd === "kick") {
    const user = args[0];
    const member = await message.guild.members.fetch(user).catch(() => null);
    if (!member) return message.reply("User not found");

    await member.kick();
    message.reply(`👢 Kicked ${member.user.tag}`);

    sendLog(message.guild, `👢 ${message.author.tag} kicked ${member.user.tag}`);
  }

  // ================= MUTE (timeout) =================
  if (cmd === "mute") {
    const user = args[0];
    const time = args[1];

    if (!user || !time) return message.reply("Usage: !mute <id> <10m/1h>");

    const member = await message.guild.members.fetch(user).catch(() => null);
    if (!member) return message.reply("User not found");

    let ms = 0;
    if (time.endsWith("m")) ms = parseInt(time) * 60000;
    if (time.endsWith("h")) ms = parseInt(time) * 3600000;

    await member.timeout(ms);
    message.reply(`🔇 Muted ${member.user.tag} for ${time}`);

    sendLog(message.guild, `🔇 ${message.author.tag} muted ${member.user.tag} for ${time}`);
  }

  // ================= UNMUTE =================
  if (cmd === "unmute") {
    const user = args[0];
    const member = await message.guild.members.fetch(user).catch(() => null);

    if (!member) return message.reply("User not found");

    await member.timeout(null);
    message.reply(`🔊 Unmuted ${member.user.tag}`);

    sendLog(message.guild, `🔊 ${message.author.tag} unmuted ${member.user.tag}`);
  }

  // ================= CLEAR =================
  if (cmd === "clear") {
    const amount = parseInt(args[0]);
    if (!amount) return message.reply("Usage: !clear <number>");

    await message.channel.bulkDelete(amount);
    message.channel.send(`🧹 Deleted ${amount} messages`);

    sendLog(message.guild, `🧹 ${message.author.tag} deleted ${amount} messages`);
  }

  // ================= ROLE =================
  if (cmd === "giverole") {
    const user = args[0];
    const roleId = args[1];

    const member = await message.guild.members.fetch(user).catch(() => null);
    const role = message.guild.roles.cache.get(roleId);

    if (!member || !role) return message.reply("Invalid user or role");

    await member.roles.add(role);
    message.reply(`✅ Role added`);

    sendLog(message.guild, `🎭 ${message.author.tag} gave role to ${member.user.tag}`);
  }

  // ================= HELP PANEL =================
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📜 Bot Commands Panel")
      .setColor("Blue")
      .setDescription("All commands:")
      .addFields(
        { name: "🛡️ Moderation", value: "`!ban` `!kick` `!mute` `!unmute` `!clear`" },
        { name: "🎭 Roles", value: "`!giverole`" },
        { name: "⚙️ Info", value: "`!ping` `!avatar`" }
      );

    message.channel.send({ embeds: [embed] });
  }

  // ================= PING =================
  if (cmd === "ping") {
    message.reply("🏓 Pong!");
  }

  // ================= AVATAR =================
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;
    message.reply(user.displayAvatarURL());
  }
});

client.login(process.env.BOT_TOKEN);
