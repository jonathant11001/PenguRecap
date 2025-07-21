import { Message } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';

export async function handlePingCommand(message: Message, args: string[], dbService: DatabaseService) {
  await message.reply('🏓 Pong!');
}
