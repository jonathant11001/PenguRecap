import { CategorizationService } from '../services/categorizationService';

async function testCategorization() {
  console.log('🧪 Starting categorization service test...\n');

  const categorizationService = new CategorizationService();

  // Test messages
  const testMessages = [
    "I love pizza and pasta",
    "Playing Minecraft with friends tonight",
    "Going to Paris next month for vacation",
    "Watched a great movie on Netflix",
    "Just regular conversation here"
  ];

  for (const message of testMessages) {
    console.log(`📝 Testing message: "${message}"`);

    try {
      const result = await categorizationService.categorizeMessage(message);
      console.log('✅ Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Error:', error);
    }

    console.log('---\n');
  }

  // Test connection
  console.log('🔌 Testing connection...');
  const connectionTest = await categorizationService.testConnection();
  console.log(`Connection test: ${connectionTest ? '✅ SUCCESS' : '❌ FAILED'}`);
}

// Run the test
testCategorization().catch(console.error);