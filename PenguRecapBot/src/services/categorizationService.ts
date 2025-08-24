import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
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

export interface CategoryResult {
  categories: Array<{
    name: string;
    items: string[];
  }>;
}

export class CategorizationService {
  private client: any;

  constructor(serverAddress: string = 'localhost:50051') {
    this.client = new summarizerProto.summarizer.SummarizerService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  /**
   * categorizeMessage now accepts an optional fetchItemsForCategory callback.
   * If provided, when the model returns {"requestedCategory":"..."} we call the callback
   * to resolve the actual item names for that preference id / category and return them
   * as the items array. If the callback returns no items, we return empty categories.
   */
  async categorizeMessage(
    content: string,
    fetchItemsForCategory?: (category: string) => Promise<string[]>,
    promptOverride?: string
  ): Promise<CategoryResult> {
    return new Promise((resolve) => {
      const defaultPrompt = `
You are a classification assistant.
Given a conversation (one or more user messages), classify the most recent user message
using both the current message and prior context if needed.

IMPORTANT INSTRUCTIONS — OUTPUT MUST BE STRICT JSON ONLY:
- Return EXACTLY one of the following JSON formats and nothing else (no explanation, no bullets, no markup):
  1) Single category + item: {"category":"<category>","item":"<item>"}
  2) Multiple items: {"category":"<category>","items":["<item1>","<item2>"]}
  3) Recommendation request: {"requestedCategory":"<category>"} or {"requestedCategory": null}
- Categories must be general (e.g., "food","game","movie","music").
- Items must be specific, lowercased, and trimmed (e.g., "sushi","valorant","inception").
- If multiple items are present return them in the "items" array.
- Prefer existing categories when applicable; create new only if none fit.
- If you cannot determine a category, return {"requestedCategory": null} — do NOT output free text.

ABBREVIATION HANDLING:
- Expand common abbreviations and informal short-hands before producing the JSON fields.
- Examples to expand (not an exhaustive list): 
  - "lol" -> "league of legends"
  - "ny" -> "new york"
- When an abbreviation refers to an item, the JSON "item" or "items" must contain the expanded full name (lowercased and trimmed).
- Do NOT include the abbreviation or any explanatory text in the output — only the expanded names in the JSON.

Example:
Conversation:
U1: "Let's play lol later"
Latest message: "Where should we play?"
Output: {"category":"game","item":"league of legends"}

Now classify this conversation:
"""${content}"""`;

      const prompt = promptOverride ?? defaultPrompt;
      const request = { messages: [prompt] };

      this.client.Summarize(request, (error: any, response: any) => {
        if (error) {
          console.error('gRPC Error during categorization:', error);
          resolve({ categories: [] });
          return;
        }
        // parseResponse is async because it may call fetchItemsForCategory
        this.parseResponse(response.summary, fetchItemsForCategory)
          .then(result => resolve(result))
          .catch(err => {
            console.error('Error parsing categorization response:', err);
            resolve({ categories: [] });
          });
      });
    });
  }

  /**
   * parseResponse now optionally calls fetchItemsForCategory when model returns requestedCategory.
   */
  private async parseResponse(
    response: string,
    fetchItemsForCategory?: (category: string) => Promise<string[]>
  ): Promise<CategoryResult> {
    try {
      console.log('🔍 Raw response from AI:', response);

      const jsonMatches = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

      if (jsonMatches && jsonMatches.length > 0) {
        for (const jsonStr of jsonMatches) {
          try {
            console.log('📋 Trying to parse JSON:', jsonStr);

            const cleanedJson = jsonStr
              .replace(/,(\s*[}\]])/g, '$1')
              .replace(/([}\]])\s*\./g, '$1')
              .replace(/\.\s*$/g, '')
              .trim();

            console.log('🧹 Cleaned JSON:', cleanedJson);

            const parsed = JSON.parse(cleanedJson);
            console.log('✅ Parsed JSON:', parsed);

            // requestedCategory -> recommendation request flow
            if (parsed.requestedCategory !== undefined) {
              console.log('✅ Found requestedCategory format');

              if (parsed.requestedCategory === null) {
                console.log('⚠️ RequestedCategory is null, returning empty categories');
                return { categories: [] };
              }

              const categoryName = parsed.requestedCategory.toLowerCase().trim();

              // If a fetchItemsForCategory callback is provided, use it to fetch real item names.
              if (typeof fetchItemsForCategory === 'function') {
                try {
                  const fetchedItems = await fetchItemsForCategory(categoryName);

                  if (!fetchedItems || fetchedItems.length === 0) {
                    console.log(`🔎 No items found for category "${categoryName}", returning empty categories`);
                    return { categories: [] }; // no fallback
                  }

                  console.log(`🎯 Returning requestedCategory: ${categoryName}`);
                  console.log(`📦 Items in category "${categoryName}": [${fetchedItems.join(', ')}]`);

                  return {
                    categories: [{
                      name: categoryName,
                      items: fetchedItems.map(it => String(it).toLowerCase().trim())
                    }]
                  };
                } catch (fetchErr) {
                  console.error('❌ Error fetching items for category:', fetchErr);
                  return { categories: [] };
                }
              }

              // Backwards compatibility: if no fetch callback provided, return sentinel
              const items = (Array.isArray(parsed.item) ? parsed.item : typeof parsed.item === 'string' ? [parsed.item] : ['recommendation_request'])
                .filter((it: any) => typeof it === 'string' && it.trim().length > 0)
                .map((it: string) => it.toLowerCase().trim());

              console.log(`🎯 Returning requestedCategory (no fetch callback): ${categoryName}`);
              console.log(`📦 Items in category "${categoryName}": [${items.join(', ')}]`);

              return {
                categories: [{
                  name: categoryName,
                  items
                }]
              };
            }

            // other formats (categories array)
            if (parsed.categories && Array.isArray(parsed.categories)) {
              const processedCategories = parsed.categories
                .filter((cat: any) => cat.name && typeof cat.name === 'string')
                .map((cat: any) => ({
                  name: cat.name.toLowerCase().trim(),
                  items: Array.isArray(cat.items)
                    ? cat.items.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
                    : []
                }))
                .filter((cat: any) => cat.items.length > 0);

              if (processedCategories.length > 0) {
                console.log('✅ Processed categories array:', processedCategories);

                processedCategories.forEach(cat => {
                  console.log(`📦 Items in category "${cat.name}": [${cat.items.join(', ')}]`);
                });

                return { categories: processedCategories };
              }
            }

            // single category/item format
            if (parsed.category && parsed.item) {
              console.log('✅ Converting single category/item format');

              const categoryName = parsed.category.toLowerCase().trim();
              const items = [parsed.item.toLowerCase().trim()];

              console.log(`📦 Items in category "${categoryName}": [${items.join(', ')}]`);

              return {
                categories: [{
                  name: categoryName,
                  items: items
                }]
              };
            }

            console.log('⚠️ Parsed JSON but no recognized format, trying next...');
          } catch (parseError) {
            console.log('❌ Failed to parse this JSON chunk:', parseError.message);
            continue;
          }
        }
      } else {
        console.log('❌ No JSON objects found in response');
      }
    } catch (error) {
      console.error('❌ Error in parseResponse:', error);
    }

    console.log('⚠️ No valid categorization found, returning empty result');
    return { categories: [] };
  }

  async categorizeItem(item: string): Promise<string> {
    try {
      const result = await this.categorizeMessage(item);

      if (result.categories && result.categories.length > 0) {
        return result.categories[0].name;
      }

      return 'general';
    } catch (error) {
      console.error('Error categorizing single item:', error);
      return 'general';
    }
  }
}
