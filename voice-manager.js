const { 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    entersState,
    getVoiceConnection,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior
} = require('@discordjs/voice');

class VoiceManager {
    constructor(client) {
        this.client = client;
        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 10; // Increased for better persistence
        this.reconnectDelay = 3000; // Reduced delay for faster recovery
        this.lastConnectionCheck = new Map();
    }

    async joinChannel(guild, channelId) {
        try {
            // Check if channel exists and bot has permissions
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                throw new Error('Voice channel not found');
            }

            if (!channel.isVoiceBased()) {
                throw new Error('Channel is not a voice channel');
            }

            // Check permissions
            const permissions = channel.permissionsFor(this.client.user);
            if (!permissions.has(['Connect', 'Speak'])) {
                throw new Error('Bot lacks permission to connect to this voice channel');
            }

            // Destroy existing connection if any
            const existingConnection = getVoiceConnection(guild.id);
            if (existingConnection) {
                console.log(`[${new Date().toISOString()}] Destroying existing connection for guild ${guild.id}`);
                existingConnection.destroy();
                this.connections.delete(guild.id);
            }

            console.log(`[${new Date().toISOString()}] Joining voice channel: ${channel.name} in guild: ${guild.name}`);

            // Create new voice connection
            const connection = joinVoiceChannel({
                channelId: channelId,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true, // Deaf the bot to save bandwidth
                selfMute: false // Keep unmuted in case we need to play audio later
            });

            // Setup connection event handlers
            this.setupConnectionHandlers(connection, guild.id, channelId);
            
            // Store the connection
            this.connections.set(guild.id, {
                connection: connection,
                channelId: channelId,
                joinedAt: new Date()
            });

            // Reset reconnect attempts counter
            this.reconnectAttempts.set(guild.id, 0);

            // Wait for connection to be ready
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            
            console.log(`[${new Date().toISOString()}] Successfully connected to voice channel: ${channel.name}`);
            return connection;

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to join voice channel:`, error);
            throw error;
        }
    }

    setupConnectionHandlers(connection, guildId, channelId) {
        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            console.log(`[${new Date().toISOString()}] Voice connection disconnected for guild ${guildId}`);
            
            try {
                // Try to reconnect automatically
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                
                console.log(`[${new Date().toISOString()}] Voice connection recovered for guild ${guildId}`);
            } catch (error) {
                // Connection was truly lost, attempt to reconnect
                console.log(`[${new Date().toISOString()}] Connection lost, attempting to reconnect...`);
                
                connection.destroy();
                this.connections.delete(guildId);
                
                // Attempt reconnection with exponential backoff
                this.attemptReconnection(guildId, channelId);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`[${new Date().toISOString()}] Voice connection destroyed for guild ${guildId}`);
            this.connections.delete(guildId);
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[${new Date().toISOString()}] Voice connection ready for guild ${guildId}`);
        });

        connection.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] Voice connection error for guild ${guildId}:`, error);
        });

        // Handle state changes
        connection.on('stateChange', (oldState, newState) => {
            console.log(`[${new Date().toISOString()}] Voice connection state changed: ${oldState.status} -> ${newState.status} for guild ${guildId}`);
        });
    }

    async attemptReconnection(guildId, channelId) {
        const attempts = this.reconnectAttempts.get(guildId) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            console.error(`[${new Date().toISOString()}] Max reconnection attempts reached for guild ${guildId}`);
            this.reconnectAttempts.delete(guildId);
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
        console.log(`[${new Date().toISOString()}] Reconnecting in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

        setTimeout(async () => {
            try {
                const guild = this.client.guilds.cache.get(guildId);
                if (guild) {
                    this.reconnectAttempts.set(guildId, attempts + 1);
                    await this.joinChannel(guild, channelId);
                    console.log(`[${new Date().toISOString()}] Reconnection successful for guild ${guildId}`);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Reconnection failed for guild ${guildId}:`, error);
                this.attemptReconnection(guildId, channelId);
            }
        }, delay);
    }

    leaveChannel(guildId) {
        const connectionInfo = this.connections.get(guildId);
        if (connectionInfo) {
            console.log(`[${new Date().toISOString()}] Leaving voice channel for guild ${guildId}`);
            connectionInfo.connection.destroy();
            this.connections.delete(guildId);
            this.reconnectAttempts.delete(guildId);
            return true;
        }
        return false;
    }

    isConnected(guildId) {
        const connectionInfo = this.connections.get(guildId);
        return connectionInfo && connectionInfo.connection.state.status === VoiceConnectionStatus.Ready;
    }

    getConnection(guildId) {
        const connectionInfo = this.connections.get(guildId);
        return connectionInfo ? connectionInfo.connection : null;
    }

    getConnectionInfo(guildId) {
        return this.connections.get(guildId);
    }

    getConnectionCount() {
        return this.connections.size;
    }

    getAllConnections() {
        const connections = [];
        for (const [guildId, info] of this.connections.entries()) {
            const guild = this.client.guilds.cache.get(guildId);
            connections.push({
                guildId: guildId,
                guildName: guild ? guild.name : 'Unknown',
                channelId: info.channelId,
                status: info.connection.state.status,
                joinedAt: info.joinedAt,
                uptime: Date.now() - info.joinedAt.getTime()
            });
        }
        return connections;
    }

    disconnectAll() {
        console.log(`[${new Date().toISOString()}] Disconnecting from all voice channels...`);
        for (const [guildId, info] of this.connections.entries()) {
            info.connection.destroy();
        }
        this.connections.clear();
        this.reconnectAttempts.clear();
    }

    // Health check for connections
    async healthCheck() {
        const healthStatus = {
            totalConnections: this.connections.size,
            healthyConnections: 0,
            unhealthyConnections: 0,
            connections: []
        };

        for (const [guildId, info] of this.connections.entries()) {
            const isHealthy = info.connection.state.status === VoiceConnectionStatus.Ready;
            
            if (isHealthy) {
                healthStatus.healthyConnections++;
            } else {
                healthStatus.unhealthyConnections++;
            }

            const guild = this.client.guilds.cache.get(guildId);
            healthStatus.connections.push({
                guildId: guildId,
                guildName: guild ? guild.name : 'Unknown',
                status: info.connection.state.status,
                healthy: isHealthy,
                uptime: Date.now() - info.joinedAt.getTime()
            });
        }

        return healthStatus;
    }
}

module.exports = { VoiceManager };
