const { spawn } = require('child_process');
const fs = require('fs');

// Enhanced startup script for maximum uptime
console.log(`[${new Date().toISOString()}] Starting Discord Bot with enhanced reliability...`);

// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

let botProcess;
let restartCount = 0;
const maxRestarts = 1000; // Essentially unlimited
const restartDelay = 2000; // 2 seconds

function startBot() {
    console.log(`[${new Date().toISOString()}] Starting bot process (restart #${restartCount})...`);
    
    botProcess = spawn('node', ['index.js'], {
        stdio: ['inherit', 'inherit', 'inherit']
    });

    botProcess.on('close', (code) => {
        console.log(`[${new Date().toISOString()}] Bot process exited with code ${code}`);
        
        if (restartCount < maxRestarts) {
            restartCount++;
            console.log(`[${new Date().toISOString()}] Restarting bot in ${restartDelay}ms...`);
            setTimeout(startBot, restartDelay);
        } else {
            console.error(`[${new Date().toISOString()}] Maximum restart limit reached. Bot stopped.`);
        }
    });

    botProcess.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Bot process error:`, error);
        console.log(`[${new Date().toISOString()}] Attempting restart...`);
        setTimeout(startBot, restartDelay);
    });
}

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] Received SIGINT. Shutting down gracefully...`);
    if (botProcess) {
        botProcess.kill('SIGINT');
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] Received SIGTERM. Shutting down gracefully...`);
    if (botProcess) {
        botProcess.kill('SIGTERM');
    }
    process.exit(0);
});

// Start the bot
startBot();

// Health monitoring
setInterval(() => {
    if (!botProcess || botProcess.killed) {
        console.log(`[${new Date().toISOString()}] Bot process not running, restarting...`);
        startBot();
    }
}, 10000); // Check every 10 seconds