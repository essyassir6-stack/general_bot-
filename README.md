# Discord Moderation Bot

A simple but powerful Discord bot with 21 commands. Commands work in ANY channel!

## Commands (21 total)

**Moderation (8)**: ban, kick, mute, unmute, warn, clear, timeout, softban
**Role (4)**: giverole, removerole, roles, createrole  
**Utility (5)**: avatar, serverinfo, userinfo, ping, botinfo
**Fun (4)**: hello, pingpong, 8ball, hug

## Setup

1. Install Node.js 18+
2. Run `npm install`
3. Add environment variables (see below)
4. Run `npm start`

## Environment Variables (Required)

- `BOT_TOKEN` - Your Discord bot token
- `LOG_CHANNEL_ID` - Channel ID where logs will be sent
- `MOD_ROLE_ID` - Role ID that can use moderation commands

## Railway Deployment

1. Push code to GitHub
2. On Railway: New Project → Deploy from GitHub
3. Go to Variables tab and add:
   - `BOT_TOKEN=your_token_here`
   - `LOG_CHANNEL_ID=your_log_channel_id`
   - `MOD_ROLE_ID=your_mod_role_id`
4. Railway auto-deploys!

## Bot Permissions Needed

- Ban Members
- Kick Members
- Moderate Members
- Manage Roles
- Manage Messages
- Send Messages
- Embed Links
- Read Messages
- View Channels

## Features

✅ 21 commands in ONE simple file
✅ Commands work in ANY channel
✅ Full logging system
✅ Role-based permissions
✅ Clean help panel with categories
✅ No hardcoded values
✅ Ready for Railway
