import { Client } from 'discord.js';

export function handleReady(client: Client) {
  console.log(`🤖 ${client.user?.tag} is now online!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  client.user?.setActivity('messages for recap', { type: 3 }); // Type 3 = Watching
}
