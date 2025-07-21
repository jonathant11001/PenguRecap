import { Message, User, Collection } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import { NewDiscordMessage } from '../../models/Message';
import { config } from '../../config';
import { handleCommand } from '../commands/commandHandler';

export async function handleMessageCreate(message: Message, dbService: DatabaseService) {
  // Handle commands first
  if (message.content.startsWith(config.bot.prefix)) {
    if (message.author.bot && !config.bot.saveBotMessages) return;
    
    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    
    if (commandName) {
      await handleCommand(message, commandName, args, dbService);
    }
    return; // Don't save command messages
  }

  // Process regular messages for saving
  await saveMessageToDatabase(message, dbService);
}

async function saveMessageToDatabase(message: Message, dbService: DatabaseService) {
  try {
    // Skip bot messages (unless configured otherwise)
    if (message.author.bot && !config.bot.saveBotMessages) return;
    
    // Skip messages mentioning bots
    if (message.mentions.users.some((user: User) => user.bot)) return;
    
    // Save message to database
    const messageData: NewDiscordMessage = {
      username: message.author.username,
      content: message.content || '',
      userBot: message.author.bot,
      timestamp: message.createdAt,
      fetchedTime: new Date()
    };

    const savedMessage = await dbService.saveMessage(messageData);
    if (savedMessage) {
      console.log(`💾 Saved message from ${message.author.username}`);
    }
  } catch (error) {
    console.error('❌ Error saving message:', error);
  }
}
