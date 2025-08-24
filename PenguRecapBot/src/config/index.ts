export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  bot: {
    prefix: '!',
    saveBotMessages: false,
  }
};

// Validate required environment variables
export function validateConfig() {
  const required = [
    'DISCORD_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
