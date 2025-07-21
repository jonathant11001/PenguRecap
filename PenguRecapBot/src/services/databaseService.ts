import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DiscordMessage, NewDiscordMessage } from '../models/Message';

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

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error fetching last recorded message:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error('Database service error:', err);
      return null;
    }
  }
}
