import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { DiscordMessage } from '../models/Message';
import path from 'path';

const PROTO_PATH = path.join(process.cwd(), '../Summarizer/proto/summarizer.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const summarizerProto = grpc.loadPackageDefinition(packageDefinition) as any;

export class SummarizerService {
  private client: any;

  constructor(serverAddress: string = 'localhost:50051') {
    this.client = new summarizerProto.summarizer.SummarizerService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  async summarizeMessages(messages: DiscordMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = {
        messages: messages.map(msg => `${msg.username}: ${msg.content}`)
      };

      this.client.Summarize(request, (error: any, response: any) => {
        if (error) {
          console.error('gRPC Error:', error);
          reject(new Error(`Failed to get summary: ${error.message}`));
        } else {
          resolve(response.summary);
        }
      });
    });
  }

  // Test connection to the gRPC server
  async testConnection(): Promise<boolean> {
    try {
      const testMessages: DiscordMessage[] = [{
        id: 1,
        content: 'test message',
        username: 'test_user',
        userBot: false,
        timestamp: new Date(),
        fetchedTime: new Date()
      }];

      await this.summarizeMessages(testMessages);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
