# Quick Reference: Adding a New Search Source

This guide shows how to add semantic search for a new data source in ~2 hours.

## Example: Adding Documentation Search

### Step 1: Create Source Module (30 min)

Create `mcp-server/src/tools/search/sources/docs.js`:

```javascript
import { generateEmbedding } from '../core/embeddings.js';
import { vectorSearch, loadVectorDb } from '../core/vector-search.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VECTOR_DB_PATH = join(__dirname, '../../../../.vector-db/docs/vectors.json');

let vectors = null;

async function initializeDocsVectors() {
    if (vectors) return vectors;
    vectors = await loadVectorDb(VECTOR_DB_PATH);
    return vectors;
}

async function docsSemanticSearch(params = {}) {
    const { query, file_path, section, limit = 20 } = params;
    
    if (!query) throw new Error('query is required');
    
    const docs = await initializeDocsVectors();
    const queryVector = await generateEmbedding(query);
    const searchResults = vectorSearch(queryVector, docs, limit * 2);
    
    // Filter by file_path, section, etc.
    const filteredResults = searchResults
        .filter(r => !file_path || r.metadata.file_path.includes(file_path))
        .filter(r => !section || r.metadata.section === section)
        .slice(0, limit);
    
    return {
        query,
        total_results: filteredResults.length,
        results: filteredResults.map(r => ({
            text: r.metadata.text,
            score: r.similarity,
            file_path: r.metadata.file_path,
            section: r.metadata.section
        })),
        search_type: 'semantic'
    };
}

export const docsSearchTools = {
    docs_semantic_search: {
        description: 'Semantic search in documentation',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                file_path: { type: 'string', description: 'Filter by file path (optional)' },
                section: { type: 'string', description: 'Filter by section (optional)' },
                limit: { type: 'number', description: 'Max results (default: 20)', default: 20 }
            },
            required: ['query']
        },
        handler: docsSemanticSearch
    }
};
```

### Step 2: Update Index (5 min)

Update `mcp-server/src/tools/search/index.js`:

```javascript
import { discordSearchTools } from './sources/discord.js';
import { docsSearchTools } from './sources/docs.js';  // Add this

export const searchTools = {
    ...discordSearchTools,
    ...docsSearchTools  // Add this
};
```

### Step 3: Create Indexing Script (45 min)

Create `mcp-server/scripts/index-docs.js`:

```javascript
import { indexDocuments, saveVectorDb, chunkText } from '../src/tools/search/index.js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function readDocsFiles(dir) {
    const files = await readdir(dir, { recursive: true, withFileTypes: true });
    const docs = [];
    
    for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.md')) continue;
        
        const filePath = join(file.path, file.name);
        const content = await readFile(filePath, 'utf-8');
        
        // Chunk large documents
        const chunks = chunkText(content, { chunkSize: 1000, chunkOverlap: 200 });
        
        chunks.forEach((chunk, i) => {
            docs.push({
                id: `${filePath}_chunk_${i}`,
                text: chunk,
                metadata: {
                    text: chunk,
                    file_path: filePath,
                    chunk_index: i,
                    total_chunks: chunks.length
                }
            });
        });
    }
    
    return docs;
}

async function main() {
    console.log('Reading documentation files...');
    const docs = await readDocsFiles('docs');
    
    console.log(`Indexing ${docs.length} document chunks...`);
    const vectors = await indexDocuments(docs, {
        batchSize: 10,
        onProgress: (p) => console.log(`Progress: ${p.percentage}%`)
    });
    
    console.log('Saving vector database...');
    await saveVectorDb(vectors, '.vector-db/docs/vectors.json');
    
    console.log('Done!');
}

main().catch(console.error);
```

### Step 4: Add NPM Script (2 min)

Update `mcp-server/package.json`:

```json
{
  "scripts": {
    "index-docs": "node scripts/index-docs.js"
  }
}
```

### Step 5: Enable in Config (3 min)

Update `.tf/modules-config.json`:

```json
{
  "moduleId": "documentation",
  "vectorDb": {
    "enabled": true,  // Change from false to true
    "path": ".vector-db/docs"
  }
}
```

### Step 6: Run Indexing (10 min)

```bash
cd mcp-server
npm run index-docs
```

### Step 7: Test (5 min)

```bash
# Start server
node src/server.js

# Test with MCP client
docs_semantic_search({
  query: "How to deploy the application?",
  limit: 5
})
```

## Total Time: ~2 hours

## Checklist

- [ ] Create source module in `sources/{source}.js`
- [ ] Update `search/index.js` to export new tools
- [ ] Create indexing script in `scripts/index-{source}.js`
- [ ] Add npm script in `package.json`
- [ ] Enable vectorDb in `modules-config.json`
- [ ] Run indexing script
- [ ] Test search functionality
- [ ] Update documentation

## Common Patterns

### Metadata Structure

```javascript
{
  id: "unique_id",
  embedding: [0.1, 0.2, ...],  // Generated automatically
  metadata: {
    text: "Content to search",  // Required
    // Add source-specific fields:
    file_path: "path/to/file",
    author: "username",
    date: "2025-12-19",
    category: "tutorial",
    // etc.
  }
}
```

### Filters Pattern

```javascript
// In handler function
const filteredResults = searchResults
    .filter(r => !filter1 || r.metadata.field1 === filter1)
    .filter(r => !filter2 || r.metadata.field2 === filter2)
    .slice(0, limit);
```

### Chunking Pattern

```javascript
import { chunkText } from '../core/indexer.js';

const chunks = chunkText(largeDocument, {
    chunkSize: 1000,      // Characters per chunk
    chunkOverlap: 200,    // Overlap between chunks
    separator: '\n\n'     // Split on paragraphs
});
```

## Tips

1. **Start simple** - Get basic search working first, add filters later
2. **Test incrementally** - Test after each step
3. **Use existing sources as templates** - Copy from `discord.js`
4. **Document metadata** - Clear metadata structure helps debugging
5. **Chunk wisely** - Balance between context and precision

## Need Help?

- See `mcp-server/docs/search-architecture.md` for detailed architecture
- See `sources/discord.js` for a complete example
- See `docs/architecture/semantic-search-strategy.md` for design rationale
