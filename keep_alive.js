const express = require('express');

function createKeepAliveServer(port = 5000) {
    const app = express();
    
    // Basic health check endpoint
    app.get('/', (req, res) => {
        res.json({
            status: 'alive',
            service: 'discord-voice-bot',
            message: 'Bot is maintaining 24/7 voice presence',
            timestamp: new Date().toISOString()
        });
    });
    
    // Detailed status endpoint
    app.get('/status', (req, res) => {
        const memoryUsage = process.memoryUsage();
        res.json({
            status: 'online',
            service: 'discord-voice-bot',
            uptime: process.uptime(),
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
            },
            timestamp: new Date().toISOString()
        });
    });
    
    // Health endpoint for monitoring services
    app.get('/health', (req, res) => {
        res.status(200).json({
            healthy: true,
            service: 'discord-voice-bot'
        });
    });
    
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`[${new Date().toISOString()}] Keep-alive server running on port ${port}`);
    });
    
    return server;
}

function keepAlive(port = 5000) {
    return createKeepAliveServer(port);
}

module.exports = { keepAlive, createKeepAliveServer };