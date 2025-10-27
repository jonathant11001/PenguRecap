import { Message, User } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import { CategorizationService } from '../../services/categorizationService';
import { handleCommand } from '../commands/commandHandler';
import { config } from '../../config';
import { NewDiscordMessage } from '../../models/Message';

export async function handleMessageCreate(message: Message, dbService: DatabaseService) {
  // Skip messages from bot
  if (message.author.bot && !config.bot.saveBotMessages) return;

  // Checks if bot was called
  if (await handleBotReference(message, dbService)) {
    return;
  }

  // If message was a command
  if (message.content.startsWith(config.bot.prefix)) {
    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (commandName) {
      await handleCommand(message, commandName, args, dbService);
    }
    return;
  }

  // Process regular messages for saving
  await saveMessageToDatabase(message, dbService);
}

async function handleBotReference(message: Message, dbService: DatabaseService): Promise<boolean> {
  const content = message.content.toLowerCase();
  const botName = 'pengu';

  const isBotMentioned = content.includes(botName) || message.mentions.users.has(message.client.user?.id || '');
  if (!isBotMentioned) return false;

  try {
    const categorizationService = new CategorizationService();

    const existingCategories = await dbService.getAllCategories();

    const categoriesList = existingCategories.length > 0
      ? existingCategories.join(', ')
      : 'No categories exist yet';

    const prompt = `
You are Pengu, a recommendation AI.
Classify the user request into exactly one category from this list: ${categoriesList}

IMPORTANT RULES (READ CAREFULLY):
- OUTPUT MUST BE EXACTLY and ONLY valid JSON. No explanation, no bullets, no surrounding text, no markup.
- Allowed JSON format: { "requestedCategory": "<category>" } OR { "requestedCategory": null }
- Use one of the exact category names from the list above when applicable.
- If you cannot determine a category, return: { "requestedCategory": null }

User message: """${message.content}"""
`;

    const result = await categorizationService.categorizeMessage(
      message.content,
      undefined,
      prompt
    );

    console.log('🔍 Categorization result:', JSON.stringify(result, null, 2));


    let requestedCategory: string | null = null;
    if (result.categories && result.categories.length > 0) {
      requestedCategory = result.categories[0].name ?? null;
    }

    console.log(`🎯 Interpreted category: ${requestedCategory}`);

    if (!requestedCategory) {
      await message.reply("🤖 No category found for that request.");
      return true;
    }

    await provideRecommendation(message, dbService, requestedCategory);
    return true;
  } catch (error) {
    console.error('Error handling bot reference:', error);
    await message.reply("🤖 Sorry, I couldn't understand that request.");
    return true;
  }
}

async function provideRecommendation(message: Message, dbService: DatabaseService, category: string): Promise<void> {
  try {
    // get item NAMES for the category
    const names = await dbService.getItemNamesByCategory(category);

    if (!names || names.length === 0) {
      await message.reply(`📋 Category "${category}" doesn't exist or has no items.`);
      return;
    }

    const top = names.slice(0, 3);
    const rest = names.slice(3);

    let reply = '';

    if (top.length === 1) {
      reply = `🎯 I recommend **${top[0]}** for ${category}.`;
    } else {
      reply = `🎯 Top ${top.length} recommendations for ${category}: ${top.map(n => `**${n}**`).join(', ')}`;
    }

    if (rest.length > 0) {
      reply += `\n\n✨ Honorable mentions: ${rest.map(n => `**${n}**`).join(', ')}`;
    }

    await message.reply(reply);
  } catch (err) {
    console.error('Error in provideRecommendation (getItemNamesByCategory):', err);
    await message.reply(`❌ Failed to fetch recommendations for "${category}".`);
  }
}

async function saveMessageToDatabase(message: Message, dbService: DatabaseService) {
  try {
    if (message.author.bot && !config.bot.saveBotMessages) return;
    if (message.mentions.users.some((user: User) => user.bot)) return;
    if (!message.content.trim()) return;

    const categorizationService = new CategorizationService();
    let categories: Array<{ name: string; items: string[] }> = [];

    try {
      // Get existing categories to help with categorization
      const existingCategories = await dbService.getAllCategories();

      const categoriesContext = existingCategories.length > 0
        ? `\n\nExisting categories in database: ${existingCategories.join(', ')}\n- PREFER using existing categories when the content matches\n- Only create new categories if content doesn't fit existing ones`
        : '\n\nNo existing categories yet - create appropriate new categories';

      // Enhanced prompt with existing categories context
      const enhancedPrompt = `
You are a classification assistant.  
Given a user message, classify it into a category and extract the main item mentioned.
${categoriesContext}

- The category should be general (e.g., "food", "game", "movie", "music")
- The item should be specific (e.g., "sushi", "valorant", "Inception", "jazz")
- Output ONLY valid JSON with no extra text, periods, or punctuation

Format: {"category": "category_name", "item": "specific_item"}

Examples:
- "I love pizza" → {"category": "food", "item": "pizza"}
- "Let's play Valorant" → {"category": "game", "item": "valorant"}
- "Watching Marvel movies" → {"category": "movie", "item": "marvel"}

Message: """${message.content}"""

Return ONLY JSON:`;
      console.log('🔍 Enhanced categorization prompt:', enhancedPrompt);
      const result = await categorizationService.categorizeMessage(enhancedPrompt);
      categories = result.categories || [];
    } catch (error) {
      console.error('Error categorizing message:', error);
      categories = [];
    }

    // Save the message
    const messageData: NewDiscordMessage = {
      username: message.author.username,
      content: message.content,
      userBot: message.author.bot,
      timestamp: message.createdAt,
      fetchedTime: new Date()
    };

    const savedMessage = await dbService.saveMessage(messageData);
    if (!savedMessage) return;

    console.log(`✅ Saved message from ${message.author.username}`);

    // Save preferences - only process if we have valid categories
    if (categories.length === 0) {
      console.log(`⏭️ No valid categories found for message: "${message.content.substring(0, 50)}..."`);
      return;
    }

    for (const category of categories) {
      if (!category.items || category.items.length === 0) {
        console.log(`⏭️ Skipping category "${category.name}" - no items`);
        continue;
      }

      for (const item of category.items) {
        console.log(`💾 Processing preference: ${category.name} -> ${item}`);

        const preference = { category: category.name, item, weight: 1 };
        const saved = await dbService.savePreference(preference);

        if (saved) {
          console.log(`✅ Preference saved - Category: ${category.name}, Item: ${item}, Weight: ${saved.weight}`);
        } else {
          console.log(`❌ Failed to save preference: ${category.name} -> ${item}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error saving message:', error);
  }
}
