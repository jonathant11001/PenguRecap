import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { DatabaseService } from './services/databaseService';
import { handleReady } from './bot/events/ready';
import { handleMessageCreate } from './bot/events/messageCreate';
import { config, validateConfig } from './config/index';
import { Logger } from './utils/logger';

// Validate configuration
try {
  validateConfig();
  Logger.success('Configuration validated successfully');
} catch (error) {
  Logger.error('Configuration validation failed:', error);
  process.exit(1);
}

// Initialize services
const dbService = new DatabaseService();

// Test database connection on startup
dbService.testConnection()
  .then(success => {
    if (!success) {
      Logger.error('Failed to connect to Supabase. Bot will continue but messages won\'t be saved.');
    }
  })
  .catch(err => {
    Logger.error('Error testing database connection:', err);
  });

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handlers
client.once('ready', () => handleReady(client));
client.on('messageCreate', (message) => handleMessageCreate(message, dbService));

// Error handling
client.on('error', (error) => {
  Logger.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  Logger.error('Unhandled promise rejection:', error);
});

// Start the bot
client.login(config.discord.token)
  .then(() => Logger.info('Bot login initiated'))
  .catch((error) => {
    Logger.error('Failed to login:', error);
    process.exit(1);
  });