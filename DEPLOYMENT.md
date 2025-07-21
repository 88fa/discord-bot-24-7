# Discord 24/7 Voice Bot - Server Deployment Guide

## Complete File List for Upload

Upload all these files to your server:

### Core Bot Files
- `index.js` - Main bot application
- `voice-manager.js` - Voice connection management
- `commands.js` - Bot commands
- `keep_alive.js` - HTTP keep-alive server

### Configuration Files  
- `package-production.json` - Rename to `package.json` on server
- `.env.template` - Template for environment variables
- `pm2.config.js` - PM2 production configuration
- `ecosystem.config.js` - Alternative PM2 configuration
- `start.js` - Enhanced startup script

### Installation Files
- `install.sh` - Automatic installation script
- `README.md` - Complete documentation
- `DEPLOYMENT.md` - This deployment guide

## Quick Server Setup

### 1. Upload Files
Upload all files to your server directory

### 2. Rename package.json
```bash
mv package-production.json package.json
```

### 3. Run Installation
```bash
chmod +x install.sh
./install.sh
```

### 4. Setup Bot Token
```bash
# Copy template and edit
cp .env.template .env
nano .env  # Add your Discord bot token
```

### 5. Start Bot

**Simple Start:**
```bash
node index.js
```

**Production Start (Recommended):**
```bash
npm install -g pm2
pm2 start pm2.config.js
pm2 save
pm2 startup
```

**Enhanced Start:**
```bash
node start.js
```

## Bot Features

- ✅ 24/7 voice channel presence
- ✅ Auto-reconnection with exponential backoff
- ✅ Multi-server support
- ✅ HTTP keep-alive server on port 5000
- ✅ Health monitoring and logging
- ✅ Graceful shutdown handling
- ✅ Memory leak prevention

## Commands

- `!join` - Join your current voice channel
- `!joinid <id>` - Join specific channel by ID  
- `!leave` - Leave voice channel
- `!status` - Check connection status
- `!health` - Health check all connections
- `!connections` - List all connections (owner only)
- `!help` - Show help

## Monitoring

- HTTP endpoints: `http://your-server:5000/`
- Health checks every 60 seconds
- Auto-recovery every 30 seconds
- PM2 process monitoring (if used)

## Troubleshooting

1. **Bot not connecting**: Check Discord token in `.env`
2. **Voice connection fails**: Verify bot has Connect/Speak permissions
3. **Frequent disconnects**: Use PM2 for production deployment
4. **Memory issues**: PM2 config includes memory restart limits

The bot is designed to be extremely reliable with multiple layers of auto-recovery and monitoring.