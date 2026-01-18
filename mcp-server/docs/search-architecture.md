# Search Module Architecture

**Last Updated:** 2025-12-19  
**Status:** Implemented (Phase 1 Complete)

## Overview

The search module provides semantic search capabilities across different data sources using a shared core infrastructure with source-specific implementations.

## Directory Structure

```
mcp-server/src/tools/search/
├── index.js                    # Main export (all search tools)
├── core/                       # Shared infrastructure
│   ├── embeddings.js          # Embedding model management
│   ├── vector-search.js       # Vector search algorithms
│   └── indexer.js             # Document indexing utilities
└── sources/                    # Source-specific implementations
    ├── discord.js             # Discord search tools
    ├── docs.js                # Documentation search (future)
    ├── knowledge.js           # Knowledge base search (future)
    └── missions.js            # Missions search (future)
```

## Core Modules

### embeddings.js

Provides shared embedding functionality:

- `initializeEmbedder()` - Initialize the embedding model (cached)
- `generateEmbedding(text)` - Generate embedding for a single text
- `generateEmbeddings(texts)` - Generate embeddings for multiple texts
- `getEmbeddingConfig()` - Get model configuration

**Model:** `Xenova/all-MiniLM-L6-v2` (384 dimensions)

### vector-search.js

Provides vector search utilities:

- `vectorSearch(queryVector, documents, limit)` - Perform cosine similarity search
- `loadVectorDb(path)` - Load vector database from JSON
- `filterResults(results, filters)` - Filter by metadata
- `filterByDateRange(results, startDate, endDate)` - Filter by date range
- `formatResults(results, options)` - Format results for output

### indexer.js

Provides document indexing utilities:

- `indexDocuments(documents, options)` - Create vector database from documents
- `saveVectorDb(vectors, outputPath)` - Save vectors to JSON file
- `chunkText(text, options)` - Chunk large texts for embedding
- `incrementalIndex(existingVectors, newDocuments)` - Add to existing index

## Source Implementations

### Discord Search (sources/discord.js)

**Tools:**
- `discord_semantic_search` - AI-powered semantic search in Discord messages
- `discord_hybrid_search` - Combined semantic + keyword search

**Vector DB:** `.vector-db/discord/vectors.json`

**Filters:**
- `server_id` - Discord server/guild ID
- `channel_id` - Discord channel ID
- `author` - Message author
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `limit` - Maximum results (default: 20)

**Metadata Structure:**
```json
{
  "id": "msg_123",
  "embedding": [0.1, 0.2, ...],
  "metadata": {
    "text": "Message content",
    "server_id": "1414519140861083792",
    "channel_id": "1234567890",
    "author": "username",
    "date": "2025-12-19",
    "time": "10:20:34",
    "message_id": "123456789"
  }
}
```

## Usage

### In MCP Server

```javascript
import { searchTools } from './tools/search/index.js';

// Access tools
const semanticTool = searchTools.discord_semantic_search;
const hybridTool = searchTools.discord_hybrid_search;

// Call handler
const results = await semanticTool.handler({
  query: 'How to deploy the app?',
  channel_id: '1234567890',
  limit: 10
});
```

### In Indexing Scripts

```javascript
import {
  indexDocuments,
  saveVectorDb,
  chunkText
} from './src/tools/search/index.js';

// Index documents
const documents = [
  { id: 'doc1', text: 'Document content', metadata: { ... } }
];

const vectors = await indexDocuments(documents);
await saveVectorDb(vectors, '.vector-db/discord/vectors.json');
```

## Adding New Data Sources

To add a new data source (e.g., documentation):

### 1. Create Source Module

Create `sources/docs.js`:

```javascript
import { generateEmbedding } from '../core/embeddings.js';
import { vectorSearch, loadVectorDb } from '../core/vector-search.js';

const VECTOR_DB_PATH = '.vector-db/docs/vectors.json';

async function docsSemanticSearch(params) {
  const { query, file_path, section, limit = 20 } = params;
  
  // Load vectors
  const vectors = await loadVectorDb(VECTOR_DB_PATH);
  
  // Generate query embedding
  const queryVector = await generateEmbedding(query);
  
  // Search
  const results = vectorSearch(queryVector, vectors, limit);
  
  // Filter and format
  // ...
  
  return { query, results, ... };
}

export const docsSearchTools = {
  docs_semantic_search: {
    description: 'Semantic search in documentation',
    inputSchema: { ... },
    handler: docsSemanticSearch
  }
};
```

### 2. Update Index

Update `index.js`:

```javascript
import { discordSearchTools } from './sources/discord.js';
import { docsSearchTools } from './sources/docs.js';

export const searchTools = {
  ...discordSearchTools,
  ...docsSearchTools
};
```

### 3. Create Indexing Script

Create `scripts/index-docs.js`:

```javascript
import { indexDocuments, saveVectorDb } from '../src/tools/search/index.js';
import { readdir, readFile } from 'fs/promises';

// Read documentation files
const docs = await readDocsFiles();

// Index
const vectors = await indexDocuments(docs);

// Save
await saveVectorDb(vectors, '.vector-db/docs/vectors.json');
```

### 4. Update modules-config.json

```json
{
  "moduleId": "documentation",
  "vectorDb": {
    "enabled": true,
    "path": ".vector-db/docs",
    "embeddingModel": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384
  }
}
```

## Benefits of This Architecture

### Code Reuse
- ✅ 70%+ of search logic shared across all sources
- ✅ Single embedding model instance
- ✅ Shared vector search algorithm

### Maintainability
- ✅ Core logic in one place
- ✅ Source-specific code isolated
- ✅ Easy to test and debug

### Scalability
- ✅ Adding new source takes ~2 hours
- ✅ Each source can be optimized independently
- ✅ Consistent API across all sources

### User Experience
- ✅ Clear tool names (discord_semantic_search vs docs_semantic_search)
- ✅ Appropriate filters per data source
- ✅ Easy to discover and use

## Migration Notes

### Old Structure (Before 2025-12-19)

```
tools/search.js (320 lines, monolithic)
├── Discord-specific hard-coded paths
├── Embedded embedding logic
├── Embedded vector search logic
└── Discord search handlers
```

### New Structure (After 2025-12-19)

```
tools/search/
├── index.js (exports)
├── core/ (shared infrastructure)
└── sources/ (source-specific implementations)
```

### Backward Compatibility

The old `tools/search.js` now re-exports from `search/index.js`, maintaining backward compatibility with existing code.

## Performance

- **Search Time:** <500ms for typical queries
- **Embedding Model:** Cached after first load (~2-3s initial load)
- **Vector DB:** Loaded into memory on first search
- **Memory:** ~50MB for Discord vectors (depends on dataset size)

## Future Enhancements

### Phase 2: Documentation Search
- [ ] Create `sources/docs.js`
- [ ] Create indexing script for `docs/`
- [ ] Add filters: file_path, section, category

### Phase 3: Knowledge Base Search
- [ ] Create `sources/knowledge.js`
- [ ] Create indexing script for `docs/knowledge/`
- [ ] Add filters: category (ai, company, rules, info-signals)

### Phase 4: Missions Search
- [ ] Create `sources/missions.js`
- [ ] Create indexing script for `store/missions/`
- [ ] Add filters: mission_id, status, participant

### Phase 5: Optimizations
- [ ] Automatic re-indexing on file changes
- [ ] Incremental indexing
- [ ] Query caching
- [ ] Multi-source search (search across all sources)

## Related Documents

- [Semantic Search Strategy](../../docs/architecture/semantic-search-strategy.md)
- [modules-config.json](../../.tf/modules-config.json)
- [Vector Search Utils](../utils/vector-search.js)

---

**Status:** ✅ Phase 1 Complete - Discord search refactored to use modular architecture
