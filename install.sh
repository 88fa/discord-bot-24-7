#!/bin/bash

# Discord 24/7 Voice Bot Installation Script
echo "Installing Discord 24/7 Voice Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 16.11.0 or higher first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install discord.js @discordjs/voice dotenv express

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.template .env
    echo "Please edit .env file and add your Discord bot token!"
fi

# Create logs directory
mkdir -p logs

echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your Discord bot token"
echo "2. Run: node index.js (for development)"
echo "3. Or run: npm install -g pm2 && pm2 start pm2.config.js (for production)"
echo ""
echo "Bot commands:"
echo "!join - Join voice channel"
echo "!leave - Leave voice channel"
echo "!status - Check status"
echo "!help - Show all commands"