import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DiscordMessage, NewDiscordMessage } from '../models/Message';
import { Preferences, NewPreferences, CategoryPreferences, Item, NewItem } from '../models/Preferences';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          'User-Agent': 'PenguRecap-Bot/1.0.0'
        }
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Supabase connection...');
      const { error } = await this.supabase
        .from('DiscordMessages')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }

      console.log('✅ Supabase connection successful');
      return true;
    } catch (err) {
      console.error('❌ Supabase connection error:', err);
      return false;
    }
  }

  // Message methods remain the same...
  async saveMessage(messageData: NewDiscordMessage): Promise<DiscordMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('DiscordMessages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error saving message to database:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Database service error:', err);
      return null;
    }
  }

  async getRecentMessages(limit: number = 50): Promise<DiscordMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('DiscordMessages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Database service error:', err);
      return [];
    }
  }

  async getMessagesByTimeRange(startTime: Date, endTime: Date): Promise<DiscordMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('DiscordMessages')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages by time range:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Database service error:', err);
      return [];
    }
  }

  async getLastRecordedMessage(): Promise<DiscordMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('DiscordMessages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last recorded message:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error('Database service error:', err);
      return null;
    }
  }

  async savePreference(preference: { category: string; item: string; weight?: number }): Promise<Item | null> {
    try {
      const normalizedCategory = this.normalizeCategoryName(preference.category);

      console.log(`📝 Saving preference - Category: "${normalizedCategory}", Item: "${preference.item}"`);

      let categoryRecord = await this.findOrCreateCategory(normalizedCategory);
      if (!categoryRecord) {
        console.error('Failed to find or create category:', normalizedCategory);
        return null;
      }

      const { data: existingItem, error: fetchError } = await this.supabase
        .from('Item')
        .select('*')
        .eq('preference_id', categoryRecord.id)
        .eq('name', preference.item)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing item:', fetchError);
        return null;
      }

      if (existingItem) {
        // Item exists, increment weight
        console.log(`🔄 Item "${preference.item}" already exists, incrementing weight from ${existingItem.weight} to ${existingItem.weight + 1}`);

        const { data: updated, error: updateError } = await this.supabase
          .from('Item')
          .update({
            weight: existingItem.weight + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating item weight:', updateError);
          return null;
        }

        console.log('✅ Item weight updated successfully:', updated);
        return updated;
      } else {
        // Create new item
        console.log(`➕ Creating new item: "${preference.item}" in category "${normalizedCategory}"`);

        const { data: created, error: insertError } = await this.supabase
          .from('Item')
          .insert([{
            name: preference.item,
            weight: preference.weight || 1,
            preference_id: categoryRecord.id
          }])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating new item:', insertError);
          return null;
        }

        console.log('✅ New item created successfully:', created);
        return created;
      }
    } catch (error) {
      console.error('❌ Exception in savePreference:', error);
      return null;
    }
  }

  // 2. Dynamic category normalization - handles any category name
  private normalizeCategoryName(categoryName: string): string {
    return categoryName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Dynamic category creation - accepts ANY category name
  private async findOrCreateCategory(categoryName: string): Promise<Preferences | null> {
    try {
      // Try to find existing category
      const { data: existing, error: fetchError } = await this.supabase
        .from('Preferences')
        .select('id, category')
        .eq('category', categoryName)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error finding category:', fetchError);
        return null;
      }

      if (existing) {
        console.log(`✅ Found existing category: "${categoryName}"`);
        return existing;
      }

      // Create new category - accepts ANY name
      console.log(`🆕 Creating new category: "${categoryName}"`);
      const { data: created, error: createError } = await this.supabase
        .from('Preferences')
        .insert([{ category: categoryName }])
        .select('id, category')
        .single();

      if (createError) {
        console.error('Error creating category:', createError);
        return null;
      }

      console.log(`✅ New category created: "${categoryName}"`);
      return created;
    } catch (error) {
      console.error('Error in findOrCreateCategory:', error);
      return null;
    }
  }

  // 3. AI Auto-categorization integration
  async savePreferenceWithAI(item: string, aiCategorizationService?: any): Promise<Item | null> {
    try {
      let category = 'general'; // Default fallback category

      // Use AI to determine category if service is provided
      if (aiCategorizationService) {
        console.log(`🤖 Using AI to categorize item: "${item}"`);

        try {
          const result = await aiCategorizationService.categorizeMessage(item);

          if (result.categories && result.categories.length > 0) {
            // Use the first category suggested by AI
            category = result.categories[0].name;
            console.log(`🎯 AI suggested category: "${category}" for item: "${item}"`);
          } else {
            console.log(`⚠️ AI couldn't categorize "${item}", using default category: "${category}"`);
          }
        } catch (aiError) {
          console.error('❌ AI categorization failed, using default category:', aiError);
        }
      }

      // Save with determined category
      return await this.savePreference({ category, item });
    } catch (error) {
      console.error('❌ Exception in savePreferenceWithAI:', error);
      return null;
    }
  }

  // Enhanced method to get all categories (now truly dynamic)
  async getAllCategories(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('Preferences')
        .select('category')
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      const categories = (data || []).map(pref => pref.category);
      console.log(`📊 Found ${categories.length} categories:`, categories);
      return categories;
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      return [];
    }
  }

  // Enhanced method - works with ANY category name
  async getPreferencesByCategory(category: string): Promise<Item[]> {
    try {
      const normalizedCategory = this.normalizeCategoryName(category);
      console.log('🔍 Getting preferences for category:', normalizedCategory);

      const { data, error } = await this.supabase
        .from('Preferences')
        .select(`
          id,
          category,
          Item (
            id,
            name,
            weight,
            updated_at,
            preference_id
          )
        `)
        .eq('category', normalizedCategory)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📊 No category found:', normalizedCategory);
          return [];
        }
        console.error('❌ Error fetching preferences:', error);
        return [];
      }

      if (!data || !data.Item) {
        console.log('📊 No items found for category:', normalizedCategory);
        return [];
      }

      const items = data.Item as Item[];
      const sortedItems = items.sort((a, b) => {
        if (b.weight !== a.weight) {
          return b.weight - a.weight;
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      console.log(`📊 Found ${sortedItems.length} items for category "${normalizedCategory}"`);
      return sortedItems;
    } catch (error) {
      console.error('❌ Exception in getPreferencesByCategory:', error);
      return [];
    }
  }

  async getTopPreferencesByCategory(category: string, limit: number = 3): Promise<Item[]> {
    const allItems = await this.getPreferencesByCategory(category);
    return allItems.slice(0, limit);
  }

  // Enhanced to work with ANY categories
  async getAllCategoriesWithPreferences(): Promise<CategoryPreferences[]> {
    try {
      const { data, error } = await this.supabase
        .from('Preferences')
        .select(`
          id,
          category,
          Item (
            id,
            name,
            weight,
            updated_at,
            preference_id
          )
        `)
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching all preferences:', error);
        return [];
      }

      const result: CategoryPreferences[] = [];

      for (const pref of data || []) {
        if (pref.Item && Array.isArray(pref.Item) && pref.Item.length > 0) {
          // Cast and sort items by weight (descending) and updated_at (descending)
          const items = pref.Item as Item[];
          const sortedItems = items.sort((a, b) => {
            if (b.weight !== a.weight) {
              return b.weight - a.weight;
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });

          result.push({
            category: pref.category,
            items: sortedItems,
            totalItems: sortedItems.length
          });
        }
      }

      console.log(`📊 Found ${result.length} categories with preferences`);
      return result;
    } catch (error) {
      console.error('Error in getAllCategoriesWithPreferences:', error);
      return [];
    }
  }

  async getCategoryWithPreferences(category: string): Promise<CategoryPreferences | null> {
    try {
      const items = await this.getPreferencesByCategory(category);

      if (items.length === 0) {
        return null;
      }

      return {
        category: this.normalizeCategoryName(category),
        items,
        totalItems: items.length
      };
    } catch (error) {
      console.error('Error in getCategoryWithPreferences:', error);
      return null;
    }
  }

  // Bonus: Search across all categories
  async searchItems(searchTerm: string): Promise<{ category: string; items: Item[] }[]> {
    try {
      const { data, error } = await this.supabase
        .from('Item')
        .select(`
          id,
          name,
          weight,
          updated_at,
          preference_id,
          Preferences (
            category
          )
        `)
        .ilike('name', `%${searchTerm}%`)
        .order('weight', { ascending: false });

      if (error) {
        console.error('Error searching items:', error);
        return [];
      }

      // Group by category
      const grouped = new Map<string, Item[]>();

      for (const item of data || []) {
        const category = (item.Preferences as any)?.category || 'unknown';
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push({
          id: item.id,
          name: item.name,
          weight: item.weight,
          preference_id: item.preference_id,
          updated_at: item.updated_at
        });
      }

      return Array.from(grouped.entries()).map(([category, items]) => ({
        category,
        items
      }));
    } catch (error) {
      console.error('Error in searchItems:', error);
      return [];
    }
  }

  async getItemNamesByPreferenceId(preferenceId: number): Promise<string[]> {
    try {
      console.log(`🔍 getItemNamesByPreferenceId(${preferenceId})`);
      const { data, error } = await this.supabase
        .from('Item')
        .select('name')
        .eq('preference_id', preferenceId)
        .order('weight', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching items by preference_id:', error);
        return [];
      }
      return (data || []).map((row: any) => String(row.name));
    } catch (err) {
      console.error('Exception in getItemNamesByPreferenceId:', err);
      return [];
    }
  }

  async getItemNamesByCategory(category: string): Promise<string[]> {
    try {
      const normalized = this.normalizeCategoryName(category);
      console.log(`🔍 getItemNamesByCategory("${normalized}")`);

      const { data: pref, error: prefErr } = await this.supabase
        .from('Preferences')
        .select('id')
        .eq('category', normalized)
        .single();

      if (prefErr) {
        if ((prefErr as any).code === 'PGRST116') {
          console.log('No preference row for category:', normalized);
          return [];
        }
        console.error('Error fetching preference row:', prefErr);
        return [];
      }

      if (!pref || !pref.id) return [];

      return await this.getItemNamesByPreferenceId(pref.id);
    } catch (err) {
      console.error('Exception in getItemNamesByCategory:', err);
      return [];
    }
  } 
}
