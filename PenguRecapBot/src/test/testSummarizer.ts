import { SummarizerService } from '../services/summarizerService';
import { DiscordMessage } from '../models/Message';

async function testSummarizerConnection() {
  console.log('🧪 Testing summarizer service connection...');
  
  const summarizerService = new SummarizerService();
  
  // Test with sample messages
  const testMessages: DiscordMessage[] = [
    {
      id: 1,
      content: 'Hello everyone! How is everyone doing today?',
      username: 'Alice',
      userBot: false,
      timestamp: new Date('2025-07-23T10:00:00Z'),
      fetchedTime: new Date()
    },
    {
      id: 2,
      username: 'Bob',
      content: 'I am doing great! Working on some exciting projects.',
      userBot: false,
      timestamp: new Date('2025-07-23T10:01:00Z'),
      fetchedTime: new Date()
    },
    {
      id: 3,
      content: 'That sounds awesome! What kind of projects?',
      username: 'Charlie',
      userBot: false,
      timestamp: new Date('2025-07-23T10:02:00Z'),
      fetchedTime: new Date()
    }
  ];

  try {
    console.log('📤 Sending test messages to summarizer...');
    const summary = await summarizerService.summarizeMessages(testMessages);
    console.log('✅ Summary received:', summary);
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testSummarizerConnection()
  .then(success => {
    console.log(success ? '🎉 Connection test passed!' : '❌ Connection test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });
