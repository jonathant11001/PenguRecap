import 'dotenv/config';
import { DatabaseService } from '../src/services/databaseService';

async function run() {
  const db = new DatabaseService();
  const category = 'game';
  console.log(`🔔 Fetching names for category "${category}"`);
  const names = await db.getItemNamesByCategory(category);
  console.log('Result:', JSON.stringify(names, null, 2));
  console.log(`Count: ${names.length}`);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exitCode = 1;
});