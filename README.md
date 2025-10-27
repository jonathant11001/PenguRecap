<h1 align="center"> PenguRecap</h1>
<h3 align="center">AI-Powered Discord Recommendation Bot</h3>

<p align="center">
  <img src="PenguRecapIcon.png" alt="PenguRecap Logo" width="20%">
</p>

## Overview
PenguRecap is a self-learning Discord bot that analyzes group chat history to recommend activities, games, restaurants, and more — all powered by LLMs (Gemini) and a Supabase (Postgres) backend. It dynamically classifies user messages, tracks preferences, and ranks recommendations based on both frequency and recency.

## Core Features
- Dynamic category detection via Gemini LLM
- Frequency recommendation engine
- Supabase-backed normalized schema for scalable storage
- Real-time learning from natural Discord conversations

## Project Structure
```bash
PenguRecap/
├── README.md
├── .gitignore
├── PenguRecapIcon.png                 # Bot avatar/icon
│
├── PenguRecapBot/                     # Discord Bot (TypeScript/Node.js)
│   ├── package.json                   # Node.js dependencies and scripts
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── .env
│   │
│   └── src/
│       ├── index.ts                   # Main bot entry point
│       │
│       ├── bot/                       # Bot-specific functionality
│       │   ├── commands/              # Discord slash commands
│       │   │   ├── commandHandler.ts  # Command registration and handling
│       │   │   ├── game.ts           # Game-related commands
│       │   │   ├── ping.ts           # Ping/latency command
│       │   │   └── recap.ts          # Message recap/summary commands
│       │   │
│       │   └── events/               # Discord event handlers
│       │       ├── messageCreate.ts  # Message creation events
│       │       └── ready.ts          # Bot ready event
│       │
│       ├── config/                   # Configuration management
│       │   └── index.ts              # Configuration loader
│       │
│       ├── models/                   # Data models and types
│       │   ├── Message.ts            # Message data model
│       │   └── Preferences.ts        # User preferences model
│       │
│       ├── services/                 # Business logic services
│       │   ├── categorizationService.ts  # Message categorization logic
│       │   ├── databaseService.ts        # Database operations
│       │   └── summarizerService.ts      # Integration with summarizer service
│       │
│       ├── test/                     # Test files
│       │   ├── testCategorization.ts # Categorization service tests
│       │   ├── testGetItemNames.ts   # Item name extraction tests
│       │   └── testSummarizer.ts     # Summarizer service tests
│       │
│       └── utils/                    # Utility functions
│           └── logger.ts             # Logging utilities
│
└── Summarizer/                       # Summarization Service (Go/gRPC)
    ├── go.mod                        # Go module definition
    ├── .env
    │
    ├── cmd/                          # Application entry points
    │   └── server/
    │       └── main.go               # gRPC server main
    │
    ├── internal/                     # Private application code
    │   ├── gemini/
    │   │   └── client.go             # Google Gemini AI client
    │   └── server/
    │       └── summarizer.go         # Summarization service implementation
    │
    ├── pb/                           # Generated Protocol Buffer files
    │   ├── summarizer_grpc.pb.go     # gRPC service definitions
    │   └── summarizer.pb.go          # Protocol Buffer message definitions
    │
    └── proto/                        # Protocol Buffer definitions
        └── summarizer.proto          # Service and message schemas
```

## Tech Stack
- **Languages:** TypeScript, Go  
- **Frameworks:** Node.js, Discord.js v14  
- **AI Integration:** Google Gemini API (Gemini 1.5 Flash) via gRPC + Protocol Buffers  
- **Database & Infrastructure:** Supabase (PostgreSQL), dotenv for environment management  

## Author
Jonathan Tam

[![GitHub](https://img.shields.io/badge/GitHub-black?logo=github)](https://github.com/jonathant11001/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/jonathan-tam01/)
