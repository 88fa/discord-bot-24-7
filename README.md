# Discord 24/7 Voice Bot

A robust Discord bot designed for persistent 24/7 voice channel monitoring and interaction.

## Features

- **24/7 Voice Presence** - Maintains continuous presence in voice channels
- **Auto-Reconnection** - Automatically reconnects if disconnected with exponential backoff
- **Multi-Server Support** - Can join voice channels across multiple Discord servers
- **Keep-Alive System** - HTTP server prevents hosting platform sleeping
- **Health Monitoring** - Real-time health checks and status monitoring
- **Graceful Shutdown** - Proper cleanup on shutdown signals

## Commands

- `!join` - Join the voice channel you are currently in
- `!joinid <channel_id>` - Join a specific voice channel by ID
- `!leave` - Leave the current voice channel
- `!status` - Check the bot's voice connection status
- `!health` - Check the health of all voice connections
- `!connections` - List all voice connections (Owner only)
- `!help` - Show available commands

## Installation

1. **Clone/Download** all files to your server
2. **Install Node.js** (version 16.11.0 or higher)
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Setup Environment Variables**:
   - Copy `.env.template` to `.env`
   - Add your Discord bot token to `DISCORD_BOT_TOKEN`
5. **Create Discord Bot**:
   - Go to https://discord.com/developers/applications
   - Create a new application and bot
   - Copy the token to your `.env` file
   - Generate invite link with "Connect" and "Speak" permissions

## Running the Bot

### Development
```bash
node index.js
```

### Production (Recommended)
```bash
npm install -g pm2
pm2 start pm2.config.js
```

### With Enhanced Startup Script
```bash
node start.js
```

## File Structure

- `index.js` - Main bot application with Discord client and event handling
- `voice-manager.js` - Voice connection management and auto-reconnection logic
- `commands.js` - Bot command definitions and handlers
- `keep_alive.js` - HTTP keep-alive server for hosting platform compatibility
- `start.js` - Enhanced startup script with process monitoring
- `pm2.config.js` - PM2 configuration for production deployment
- `ecosystem.config.js` - Alternative PM2 configuration

## Environment Variables

- `DISCORD_BOT_TOKEN` - Your Discord bot token (required)
- `BOT_OWNER_ID` - Your Discord user ID for owner-only commands (optional)
- `DEFAULT_VOICE_CHANNEL_ID` - Auto-join channel on startup (optional)

## Health Monitoring

The bot includes multiple monitoring systems:
- HTTP endpoints on port 5000 (`/`, `/status`, `/health`)
- Console health checks every 60 seconds
- Connection stability monitoring every 30 seconds
- Automatic recovery mechanisms

## Production Deployment

For maximum uptime, use PM2 with the provided configuration:

```bash
pm2 start pm2.config.js
pm2 save
pm2 startup
```

This provides:
- Automatic restart on crashes
- Memory limit management
- Log rotation
- Scheduled restarts to prevent memory leaks

## Bot Permissions Required

- Connect (to join voice channels)
- Speak (voice channel permissions)
- Send Messages (for command responses)
- Use Voice Activity (for voice features)

## Support

The bot is designed to be self-healing and maintain 24/7 uptime. Check the logs for any connection issues and ensure your bot token is valid.

## Architecture

- **Node.js** with Discord.js v14
- **@discordjs/voice** for voice connections
- **Express.js** for keep-alive HTTP server
- **PM2** for production process management
- **Modular design** with separated concerns