# Discord Moderation Bot

A powerful Discord bot with 20+ commands in one simple file.

## Commands (20+)

**Moderation (8)**: ban, kick, mute, unmute, warn, clear, timeout, softban
**Utility (5)**: avatar, serverinfo, userinfo, ping, botinfo
**Roles (4)**: addrole, removerole, roles, createrole
**Fun (4)**: hello, pingpong, 8ball, hug

## Setup

1. Install Node.js 18+
2. Run `npm install`
3. Add environment variables (see below)
4. Run `npm start`

## Environment Variables

Create these in Railway dashboard:

- `BOT_TOKEN` - Your Discord bot token
- `LOG_CHANNEL_ID` - Channel ID for logs
- `COMMAND_CHANNEL_ID` - Channel ID where commands work
- `MOD_ROLE_ID` - Role ID that can use moderation commands

## Deployment on Railway

1. Push code to GitHub
2. On Railway: New Project → Deploy from GitHub
3. Add the 4 environment variables in Variables tab
4. Deploy automatically!

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

✅ 20+ commands in ONE file
✅ Simple and clean code
✅ Help panel with all commands
✅ Command channel restriction
✅ Full logging system
✅ Role-based permissions
✅ Railway ready
✅ No hardcoded values
