// TypeScript interface matching your Supabase DiscordMessages table
export interface DiscordMessage {
  id: number;           // int8 primary key (auto-generated)
  username: string;     // text
  content: string;      // text  
  userBot: boolean;     // bool
  timestamp: Date;      // timestamptz - when the message was created in Discord
  fetchedTime: Date;    // timestamptz - when the message was fetched/saved to DB
}

// Interface for inserting new messages (without auto-generated id)
export interface NewDiscordMessage {
  username: string;
  content: string;
  userBot: boolean;
  timestamp: Date;
  fetchedTime: Date;
}