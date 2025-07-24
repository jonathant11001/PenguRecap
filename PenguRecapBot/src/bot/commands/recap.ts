import { Message } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import { SummarizerService } from '../../services/summarizerService';
import { handleMessageCreate } from '../events/messageCreate';

export async function handleRecapCommand(message: Message, args: string[], dbService: DatabaseService) {
  try {
    const channel = message.channel;
    if (!channel.isTextBased()) {
      await message.reply('❌ This command can only be used in text channels.');
      return;
    }
    
    const lastRecordedMessage = await dbService.getLastRecordedMessage();
    let lastFetchTime = lastRecordedMessage?.fetchedTime || new Date(Date.now() - 24 * 60 * 60 * 1000); 
    
    let newMessagesCount = 0;
    let lastMessageId: string | undefined;
    let hasMoreMessages = true;

    while (hasMoreMessages) {
      const options: { limit: number; before?: string } = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }
      
      try {
        const fetchResult = await channel.messages.fetch(options);
        const fetchedMessages = fetchResult as any;
        
        if (!fetchedMessages || !fetchedMessages.size || fetchedMessages.size === 0) break;
        
        const messageArray = Array.from(fetchedMessages.values());
        const relevantMessages = messageArray.filter((msg: any) => {
          const isNewer = msg.createdAt > lastFetchTime;
          return isNewer;
        });
        
        // Let messageCreate handle each message
        for (const msg of relevantMessages) {
          await handleMessageCreate(msg as Message, dbService);
          newMessagesCount++;
        }
        
        lastMessageId = fetchedMessages.last()?.id;
        
        // Stop if we've reached messages older than our last fetch time
        const oldestMessage = fetchedMessages.last();
        if (oldestMessage && oldestMessage.createdAt <= lastFetchTime) {
          hasMoreMessages = false;
        }
        
        // Safety check to avoid infinite loops
        if (fetchedMessages.size < 100) {
          hasMoreMessages = false;
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        break;
      }
    }
    
    console.log(`💾 Processed ${newMessagesCount} messages`);
    
    // Get recent messages for recap
    const recentMessages = await dbService.getRecentMessages(20);
    
    if (recentMessages.length === 0) {
      await message.reply('📝 No recent messages found to recap.');
      return;
    }

    // Initialize summarizer service
    const summarizerService = new SummarizerService();
    
    try {
      // Test connection first
      const isConnected = await summarizerService.testConnection();
      if (!isConnected) {
        await message.reply('⚠️ Summarizer service is not available. Showing message count only.');
        await message.reply(`📊 Processed ${newMessagesCount} messages. Found ${recentMessages.length} recent messages total.`);
        return;
      }

      // Get summary from the gRPC service
      await message.reply('🤖 Generating summary...');
      const summary = await summarizerService.summarizeMessages(recentMessages);
      
      await message.reply(`📊 **Recap Summary**\n\n${summary}\n\n*Processed ${newMessagesCount} new messages, summarized ${recentMessages.length} recent messages.*`);
      
    } catch (summaryError) {
      console.error('❌ Error generating summary:', summaryError);
      await message.reply(`📊 Processed ${newMessagesCount} messages. Found ${recentMessages.length} recent messages total. Summary generation failed - check if the summarizer service is running.`);
    }  } catch (error) {
    console.error('❌ Error handling recap command:', error);
    await message.reply('⚠️ Sorry, there was an error generating the recap.');
  }
}