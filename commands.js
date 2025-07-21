function setupCommands(commands) {
    // Join voice channel command
    commands.set('join', {
        name: 'join',
        description: 'Join the voice channel you are currently in',
        async execute(message, args, voiceManager, targetChannels) {
            // Check if user is in a voice channel
            if (!message.member.voice.channel) {
                return message.reply('❌ You need to be in a voice channel first!');
            }

            const voiceChannel = message.member.voice.channel;
            const guild = message.guild;

            try {
                await voiceManager.joinChannel(guild, voiceChannel.id);
                targetChannels.set(guild.id, voiceChannel.id);
                
                message.reply(`✅ Successfully joined **${voiceChannel.name}**! I'll maintain presence here 24/7.`);
            } catch (error) {
                console.error('Join command error:', error);
                message.reply(`❌ Failed to join voice channel: ${error.message}`);
            }
        }
    });

    // Join specific channel by ID
    commands.set('joinid', {
        name: 'joinid',
        description: 'Join a specific voice channel by ID',
        async execute(message, args, voiceManager, targetChannels) {
            if (!args[0]) {
                return message.reply('❌ Please provide a voice channel ID! Usage: `!joinid <channel_id>`');
            }

            const channelId = args[0];
            const guild = message.guild;

            try {
                const channel = await message.client.channels.fetch(channelId);
                if (!channel || !channel.isVoiceBased()) {
                    return message.reply('❌ Invalid voice channel ID!');
                }

                if (channel.guild.id !== guild.id) {
                    return message.reply('❌ Channel must be in this server!');
                }

                await voiceManager.joinChannel(guild, channelId);
                targetChannels.set(guild.id, channelId);
                
                message.reply(`✅ Successfully joined **${channel.name}**! I'll maintain presence here 24/7.`);
            } catch (error) {
                console.error('JoinID command error:', error);
                message.reply(`❌ Failed to join voice channel: ${error.message}`);
            }
        }
    });

    // Leave voice channel command
    commands.set('leave', {
        name: 'leave',
        description: 'Leave the current voice channel',
        async execute(message, args, voiceManager, targetChannels) {
            const guild = message.guild;
            
            if (!voiceManager.isConnected(guild.id)) {
                return message.reply('❌ I\'m not connected to any voice channel in this server!');
            }

            try {
                voiceManager.leaveChannel(guild.id);
                targetChannels.delete(guild.id);
                message.reply('✅ Left the voice channel successfully!');
            } catch (error) {
                console.error('Leave command error:', error);
                message.reply(`❌ Failed to leave voice channel: ${error.message}`);
            }
        }
    });

    // Status command to check bot's voice connection status
    commands.set('status', {
        name: 'status',
        description: 'Check the bot\'s voice connection status',
        async execute(message, args, voiceManager, targetChannels) {
            const guild = message.guild;
            const connectionInfo = voiceManager.getConnectionInfo(guild.id);

            if (!connectionInfo) {
                return message.reply('❌ Not connected to any voice channel in this server!');
            }

            try {
                const channel = await message.client.channels.fetch(connectionInfo.channelId);
                const uptime = Date.now() - connectionInfo.joinedAt.getTime();
                const uptimeFormatted = formatUptime(uptime);

                const statusEmbed = {
                    color: connectionInfo.connection.state.status === 'ready' ? 0x00ff00 : 0xffff00,
                    title: '🎵 Voice Connection Status',
                    fields: [
                        {
                            name: 'Channel',
                            value: channel ? channel.name : 'Unknown',
                            inline: true
                        },
                        {
                            name: 'Status',
                            value: connectionInfo.connection.state.status,
                            inline: true
                        },
                        {
                            name: 'Connected Since',
                            value: connectionInfo.joinedAt.toLocaleString(),
                            inline: true
                        },
                        {
                            name: 'Uptime',
                            value: uptimeFormatted,
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                };

                message.reply({ embeds: [statusEmbed] });
            } catch (error) {
                console.error('Status command error:', error);
                message.reply(`❌ Error retrieving status: ${error.message}`);
            }
        }
    });

    // List all voice connections across all servers
    commands.set('connections', {
        name: 'connections',
        description: 'List all voice connections (Bot owner only)',
        async execute(message, args, voiceManager, targetChannels) {
            // Simple owner check - you can implement more sophisticated permission checking
            const botOwnerId = process.env.BOT_OWNER_ID;
            if (botOwnerId && message.author.id !== botOwnerId) {
                return message.reply('❌ This command is restricted to the bot owner!');
            }

            const connections = voiceManager.getAllConnections();

            if (connections.length === 0) {
                return message.reply('❌ No active voice connections!');
            }

            const connectionList = connections.map((conn, index) => {
                const uptimeFormatted = formatUptime(conn.uptime);
                return `**${index + 1}.** ${conn.guildName}\n   Status: ${conn.status}\n   Uptime: ${uptimeFormatted}`;
            }).join('\n\n');

            const embed = {
                color: 0x0099ff,
                title: `🎵 Active Voice Connections (${connections.length})`,
                description: connectionList,
                timestamp: new Date()
            };

            message.reply({ embeds: [embed] });
        }
    });

    // Health check command
    commands.set('health', {
        name: 'health',
        description: 'Check the health of all voice connections',
        async execute(message, args, voiceManager, targetChannels) {
            try {
                const health = await voiceManager.healthCheck();
                
                const embed = {
                    color: health.unhealthyConnections > 0 ? 0xff9900 : 0x00ff00,
                    title: '🏥 Voice Connection Health Check',
                    fields: [
                        {
                            name: 'Total Connections',
                            value: health.totalConnections.toString(),
                            inline: true
                        },
                        {
                            name: 'Healthy',
                            value: health.healthyConnections.toString(),
                            inline: true
                        },
                        {
                            name: 'Unhealthy',
                            value: health.unhealthyConnections.toString(),
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                };

                if (health.connections.length > 0) {
                    const connectionDetails = health.connections.map(conn => {
                        const status = conn.healthy ? '✅' : '❌';
                        const uptime = formatUptime(conn.uptime);
                        return `${status} ${conn.guildName} (${uptime})`;
                    }).join('\n');

                    embed.fields.push({
                        name: 'Connection Details',
                        value: connectionDetails.length > 1024 ? connectionDetails.substring(0, 1020) + '...' : connectionDetails,
                        inline: false
                    });
                }

                message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Health command error:', error);
                message.reply(`❌ Error checking health: ${error.message}`);
            }
        }
    });

    // Help command
    commands.set('help', {
        name: 'help',
        description: 'Show available commands',
        async execute(message, args, voiceManager, targetChannels) {
            const embed = {
                color: 0x0099ff,
                title: '🤖 Discord Voice Bot Commands',
                description: 'Here are all available commands:',
                fields: [
                    {
                        name: '!join',
                        value: 'Join the voice channel you are currently in',
                        inline: false
                    },
                    {
                        name: '!joinid <channel_id>',
                        value: 'Join a specific voice channel by ID',
                        inline: false
                    },
                    {
                        name: '!leave',
                        value: 'Leave the current voice channel',
                        inline: false
                    },
                    {
                        name: '!status',
                        value: 'Check the bot\'s voice connection status',
                        inline: false
                    },
                    {
                        name: '!health',
                        value: 'Check the health of all voice connections',
                        inline: false
                    },
                    {
                        name: '!connections',
                        value: 'List all voice connections (Owner only)',
                        inline: false
                    },
                    {
                        name: '!help',
                        value: 'Show this help message',
                        inline: false
                    }
                ],
                footer: {
                    text: 'This bot maintains 24/7 presence in voice channels'
                },
                timestamp: new Date()
            };

            message.reply({ embeds: [embed] });
        }
    });
}

function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

module.exports = { setupCommands };
