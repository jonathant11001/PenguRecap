# PenguRecap

<p align="center">
  <img src="PenguRecapIcon.png" alt="PenguRecap Logo" width="20%">
</p>

## Overview

PenguRecap is a Discord bot that listens to group conversations and stores message data in a PostgreSQL database. The bot captures message content, user info, and timestamps for later analysis and recommendation ranking. Built with TypeScript and Discord.js, connected to Supabase for persistent storage.

## Technical Capabilities

- **Message Listening**: Captures all messages in Discord channels where bot has permissions.
- **LLM Categorization**: Sends messages to gRPC Summarizer which uses Gemini API to classify into predefined categories.
- **Ranked Recommendations**: Implements frequency × time-decay scoring. Recent mentions weighted higher; items ranked on query without duplicates per category.
- **Data Persistence**: Stores message metadata (user, content, timestamp, channel, server) and categorization in Supabase PostgreSQL.
- **Error Handling**: Graceful degradation if Summarizer or database unavailable; bot continues listening but skips categorization/storage.
- **Microservice Architecture**: Decoupled bot and summarizer via gRPC enables independent scaling and Gemini API isolation.

## Architecture

```
Discord Server
    ↓
PenguRecapBot (TypeScript/Node.js)
    ├─ Discord.js event listener
    ├─ Message handler
    ├─ Database client
    ↓ (gRPC)
Summarizer (Go)
    ├─ Gemini API client
    ├─ Classification logic
    ↓
PostgreSQL (Supabase)
    ├─ Messages table (user, content, timestamp, channel, server)
```

The bot listens for messages, sends text to the gRPC Summarizer for categorization, stores results in Supabase.

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Bot Framework | Discord.js v14 | Event-driven API wrapper; stable and widely used |
| Bot Language | TypeScript | Type safety; catches errors before runtime |
| Inference Service | Go 1.19+ | Compiled binary; low latency for gRPC server |
| LLM | Google Gemini 1.5 Flash | Fast inference for message categorization |
| Bot-Service IPC | gRPC + Protobuf | Binary serialization; lower latency than JSON |
| Database | PostgreSQL (Supabase) | ACID guarantees; managed hosting |
| Environment Config | dotenv | Separates secrets from code |

## Setup

### Requirements

- Node.js 18+
- Go 1.19+
- Discord bot token ([create here](https://discord.com/developers/applications))
- Google Gemini API key ([create here](https://aistudio.google.com))
- Supabase project ([create here](https://supabase.com))

### Running Locally

Clone the repository:
```bash
git clone https://github.com/jonathant11001/PenguRecap.git
cd PenguRecap
```

Create `.env` in both `PenguRecapBot/` and `Summarizer/`:

**PenguRecapBot/.env**:
```
DISCORD_TOKEN=<your_bot_token>
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUMMARIZER_HOST=localhost
SUMMARIZER_PORT=50051
```

**Summarizer/.env**:
```
GEMINI_API_KEY=<your_gemini_api_key>
PORT=50051
```

Start the gRPC service (Terminal 1):
```bash
cd Summarizer
go mod download
go run cmd/server/main.go
```

Start the bot (Terminal 2):
```bash
cd PenguRecapBot
npm install
npm run dev
```

Invite to Discord: OAuth2 URL generator with scopes: `bot` and permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`.

## Project Structure

```
PenguRecap/
├── PenguRecapBot/                     # Discord bot (TypeScript)
│   ├── src/
│   │   ├── index.ts                   # Entry point; initializes client and event handlers
│   │   ├── config/                    # Environment variable validation
│   │   ├── bot/
│   │   │   └── events/                # Discord event listeners (ready, messageCreate)
│   │   ├── services/
│   │   │   ├── databaseService        # Supabase client and CRUD operations
│   │   │   └── summarizerService      # gRPC client wrapper
│   │   ├── utils/
│   │   │   └── logger.ts              # Logging utility
│   │   └── test/                      # Unit tests
│   └── package.json
│
└── Summarizer/                        # gRPC service (Go)
    ├── cmd/server/main.go             # Service initialization
    ├── internal/
    │   ├── gemini/                    # Gemini API client
    │   └── server/                    # gRPC handler implementation
    ├── pb/                            # Generated protobuf code
    └── proto/                         # Protobuf service definitions
```

## gRPC Service Interface

The Summarizer service exposes `CategorizeMessage(message: string, server_id: string)` which returns `(category: string, items: []string, confidence: float)`.

Called by the Discord bot each time a user sends a message. Runs on port 50051 locally.

Example call:
```typescript
const response = await summarizerClient.categorizeMessage({
  message: "Hey we should play Baldur's Gate 3 tonight",
  serverId: "123456789"
});
// response: { category: "game", items: ["Baldur's Gate 3"], confidence: 0.95 }
```

## Testing

Run tests:

```bash
npm run test-categorization
```

Test files located in `src/test/`.

## Database Schema

Messages are stored in Supabase with categorization results:
- user_id: Discord user ID
- username: Discord username
- content: Full message text
- channel_id: Discord channel ID
- server_id: Discord guild/server ID
- category: LLM-categorized type (game, restaurant, activity, movie, etc.)
- created_at: Timestamp

Recommendations are ranked on query using: `frequency × exp(-decay_rate × hours_since_mention)`.

The bot continues operating if the Summarizer service or database is unavailable, skipping categorization/storage as needed.

---

**Jonathan Tam**

[![GitHub](https://img.shields.io/badge/GitHub-black?logo=github)](https://github.com/jonathant11001/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/jonathan-tam01/)
