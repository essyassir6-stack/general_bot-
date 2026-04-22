# Discord Moderation Bot

Complete moderation bot with help panel and full command system.

## Commands

- `!ban <userID> [reason]` - Permanently ban a user
- `!kick <userID> [reason]` - Kick a user from the server
- `!warn <userID> [reason]` - Send a warning to a user
- `!timeout <userID> <duration> [reason]` - Temporarily mute a user (10m, 1h, 1d)
- `!help` or `!panel` - Show help panel with all commands

## Setup

1. Install Node.js 18+
2. Run `npm install`
3. Set environment variables:
   - `BOT_TOKEN`
   - `LOG_CHANNEL_ID`
   - `COMMAND_CHANNEL_ID`
4. Run `npm start`

## Railway Deployment

Add the three environment variables in Railway dashboard → Variables tab.
