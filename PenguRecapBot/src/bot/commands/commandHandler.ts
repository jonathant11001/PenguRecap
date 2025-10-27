import { Message } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import { handlePingCommand } from './ping';
import { handleRecapCommand } from './recap';

export async function handleCommand(message: Message, commandName: string, args: string[], dbService: DatabaseService) {
  switch (commandName) {
    case 'ping':
      await handlePingCommand(message);
      break;
      
    case 'recap':
      await handleRecapCommand(message, dbService);
      break;
      
    default:
      break;
  }
}
