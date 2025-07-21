const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { VoiceManager } = require('./voice-manager');
const { setupCommands } = require('./commands');
const { keepAlive } = require('./keep_alive');
require('dotenv').config();

class PersistentDiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.voiceManager = new VoiceManager(this.client);
        this.commands = new Collection();
        this.targetChannels = new Map(); // Store target voice channels per guild
        this.keepAliveServer = null;
        
        this.setupEventHandlers();
        this.setupCommands();
        this.setupProcessHandlers();
        this.startKeepAlive();
    }

    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`[${new Date().toISOString()}] Bot logged in as ${this.client.user.tag}!`);
            this.client.user.setActivity('Maintaining voice presence 24/7', { type: 'WATCHING' });
            
            // Auto-rejoin previously connected channels on startup
            this.rejoinStoredChannels();
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.content.startsWith('!')) return;

            const args = message.content.slice(1).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = this.commands.get(commandName);
            if (!command) return;

            try {
                await command.execute(message, args, this.voiceManager, this.targetChannels);
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error executing command ${commandName}:`, error);
                message.reply('❌ An error occurred while executing this command.');
            }
        });

        this.client.on('voiceStateUpdate', (oldState, newState) => {
            // Handle bot being moved or disconnected by admins
            if (newState.id === this.client.user.id) {
                const guildId = newState.guild.id;
                
                if (!newState.channel && oldState.channel) {
                    // Bot was disconnected
                    console.log(`[${new Date().toISOString()}] Bot was disconnected from voice channel in guild ${guildId}`);
                    
                    // Auto-reconnect after 5 seconds if we have a target channel
                    const targetChannelId = this.targetChannels.get(guildId);
                    if (targetChannelId) {
                        setTimeout(async () => {
                            try {
                                const channel = await this.client.channels.fetch(targetChannelId);
                                if (channel) {
                                    console.log(`[${new Date().toISOString()}] Attempting to reconnect to voice channel...`);
                                    await this.voiceManager.joinChannel(newState.guild, targetChannelId);
                                }
                            } catch (error) {
                                console.error(`[${new Date().toISOString()}] Failed to reconnect:`, error);
                            }
                        }, 5000);
                    }
                } else if (newState.channel && newState.channel.id !== oldState.channel?.id) {
                    // Bot was moved to a different channel
                    console.log(`[${new Date().toISOString()}] Bot moved to channel: ${newState.channel.name}`);
                    this.targetChannels.set(guildId, newState.channel.id);
                }
            }
        });

        this.client.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] Discord client error:`, error);
        });

        this.client.on('disconnect', () => {
            console.log(`[${new Date().toISOString()}] Bot disconnected from Discord`);
            // Attempt immediate reconnection
            this.attemptReconnection();
        });

        this.client.on('reconnecting', () => {
            console.log(`[${new Date().toISOString()}] Bot attempting to reconnect to Discord...`);
        });

        // Add connection monitoring
        this.client.on('shardDisconnect', () => {
            console.log(`[${new Date().toISOString()}] Shard disconnected, will auto-reconnect`);
        });

        this.client.on('shardReconnecting', () => {
            console.log(`[${new Date().toISOString()}] Shard reconnecting...`);
        });

        this.client.on('shardReady', () => {
            console.log(`[${new Date().toISOString()}] Shard ready and operational`);
        });
    }

    setupCommands() {
        setupCommands(this.commands);
    }

    setupProcessHandlers() {
        // Graceful shutdown handling
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('unhandledRejection', (reason, promise) => {
            console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
        });
        process.on('uncaughtException', (error) => {
            console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
        });
    }

    startKeepAlive() {
        try {
            this.keepAliveServer = keepAlive(5000);
            console.log(`[${new Date().toISOString()}] Keep-alive server started to maintain 24/7 uptime`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to start keep-alive server:`, error);
        }
    }

    async rejoinStoredChannels() {
        // In a production environment, you might want to persist this data
        // For now, we'll just log that the bot is ready to receive commands
        console.log(`[${new Date().toISOString()}] Bot ready to receive voice commands. Use !join to connect to voice channels.`);
    }

    async attemptReconnection() {
        if (this.client.readyAt) {
            console.log(`[${new Date().toISOString()}] Bot is still connected, no reconnection needed`);
            return;
        }

        console.log(`[${new Date().toISOString()}] Attempting Discord reconnection...`);
        
        // Wait 5 seconds before attempting reconnection
        setTimeout(async () => {
            try {
                if (!this.client.readyAt) {
                    console.log(`[${new Date().toISOString()}] Reconnecting to Discord...`);
                    await this.client.destroy();
                    await this.client.login(process.env.DISCORD_BOT_TOKEN);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Reconnection failed:`, error);
                // Try again after 30 seconds
                setTimeout(() => this.attemptReconnection(), 30000);
            }
        }, 5000);
    }

    async shutdown(signal) {
        console.log(`[${new Date().toISOString()}] Received ${signal}. Gracefully shutting down...`);
        
        // Close keep-alive server
        if (this.keepAliveServer) {
            this.keepAliveServer.close();
            console.log(`[${new Date().toISOString()}] Keep-alive server closed`);
        }
        
        // Disconnect from all voice channels
        this.voiceManager.disconnectAll();
        
        // Destroy Discord client
        await this.client.destroy();
        
        console.log(`[${new Date().toISOString()}] Bot shutdown complete.`);
        process.exit(0);
    }

    async start() {
        const token = process.env.DISCORD_BOT_TOKEN;
        
        if (!token) {
            console.error('❌ DISCORD_BOT_TOKEN environment variable is not set!');
            console.error('Please set your bot token in the .env file or environment variables.');
            process.exit(1);
        }

        try {
            await this.client.login(token);
        } catch (error) {
            console.error('❌ Failed to login to Discord:', error);
            process.exit(1);
        }
    }

    // Health check method for monitoring
    getStatus() {
        return {
            botReady: this.client.readyAt !== null,
            guilds: this.client.guilds.cache.size,
            voiceConnections: this.voiceManager.getConnectionCount(),
            uptime: this.client.uptime,
            memoryUsage: process.memoryUsage()
        };
    }
}

// Create and start the bot
const bot = new PersistentDiscordBot();

// Enhanced health monitoring with auto-recovery
setInterval(() => {
    const status = bot.getStatus();
    console.log(`[${new Date().toISOString()}] Health Check - Guilds: ${status.guilds}, Voice Connections: ${status.voiceConnections}, Memory: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    
    // Check if bot is disconnected and attempt recovery
    if (!status.botReady) {
        console.log(`[${new Date().toISOString()}] Bot appears disconnected, attempting recovery...`);
        bot.attemptReconnection();
    }
}, 60000); // Every 1 minute for more frequent monitoring

// Connection stability monitoring
setInterval(() => {
    if (!bot.client.readyAt) {
        console.log(`[${new Date().toISOString()}] Warning: Bot connection lost, initiating recovery...`);
        bot.attemptReconnection();
    }
}, 30000); // Every 30 seconds

bot.start().catch(console.error);

// Export for testing purposes
module.exports = { PersistentDiscordBot };
