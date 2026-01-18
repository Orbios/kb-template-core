# Search Module

Modular semantic search infrastructure for Orbios KB MCP.

## Quick Start

### Using Search Tools

```javascript
import { searchTools } from './search/index.js';

// Discord semantic search
const results = await searchTools.discord_semantic_search.handler({
  query: 'How to deploy the application?',
  channel_id: '1234567890',
  limit: 10
});
```

### Using Core Utilities

```javascript
import {
  generateEmbedding,
  indexDocuments,
  saveVectorDb
} from './search/index.js';

// Generate embedding
const vector = await generateEmbedding('Hello world');

// Index documents
const docs = [
  { id: 'doc1', text: 'Content', metadata: { ... } }
];
const vectors = await indexDocuments(docs);
await saveVectorDb(vectors, '.vector-db/my-source/vectors.json');
```

## Architecture

```
search/
├── index.js              # Main exports
├── core/                 # Shared infrastructure
│   ├── embeddings.js    # Embedding model
│   ├── vector-search.js # Vector search
│   └── indexer.js       # Document indexing
└── sources/             # Source-specific tools
    ├── discord.js       # Discord search
    ├── docs.js          # (future)
    ├── knowledge.js     # (future)
    └── missions.js      # (future)
```

## Available Tools

### Discord Search

- **discord_semantic_search** - AI-powered semantic search
- **discord_hybrid_search** - Combined semantic + keyword search

**Filters:** server_id, channel_id, author, start_date, end_date, limit

## Adding New Sources

See [Search Architecture Documentation](../docs/search-architecture.md) for detailed instructions.

## Documentation

- [Search Architecture](../docs/search-architecture.md) - Detailed architecture documentation
- [Semantic Search Strategy](../../docs/architecture/semantic-search-strategy.md) - Strategy and decision rationale
