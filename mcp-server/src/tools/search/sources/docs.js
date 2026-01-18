import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { generateEmbedding } from '../core/embeddings.js';
import { vectorSearch, loadVectorDb } from '../core/vector-search.js';
import { getVectorDbPath } from '../../../utils/modules-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let vectors = null;
let vectorDbPath = null;

/**
 * Initialize Documentation vector database
 * @returns {Promise<Array<Object>>} Loaded vectors
 */
async function initializeDocsVectors() {
    if (vectors) {
        return vectors;
    }

    // Get vector DB path from modules config
    if (!vectorDbPath) {
        vectorDbPath = await getVectorDbPath('documentation');
    }

    console.error('[DOCS-SEARCH] Loading vectors from:', vectorDbPath);

    if (!existsSync(vectorDbPath)) {
        throw new Error(
            `Documentation vector database not initialized. Run: npm run index-docs\nPath: ${vectorDbPath}`
        );
    }

    vectors = await loadVectorDb(vectorDbPath);
    return vectors;
}

/**
 * Semantic search in documentation
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function docsSemanticSearch(params = {}) {
    const {
        query,
        file_path,
        category,
        doc_type,
        limit = 20
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[DOCS-SEARCH] Semantic search for:', query);

    // Initialize vectors
    const docs = await initializeDocsVectors();

    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Perform vector search
    const searchResults = vectorSearch(queryVector, docs, limit * 2); // Get more for filtering

    // Filter results
    const filteredResults = [];
    for (const result of searchResults) {
        const metadata = result.metadata;

        // Apply filters
        if (file_path && !metadata.file_path.includes(file_path)) continue;
        if (category && metadata.category !== category) continue;
        if (doc_type && metadata.doc_type !== doc_type) continue;

        filteredResults.push({
            text: metadata.text,
            score: result.similarity,
            similarity: result.similarity,
            file_path: metadata.file_path,
            category: metadata.category,
            doc_type: metadata.doc_type,
            section: metadata.section,
            chunk_index: metadata.chunk_index,
            total_chunks: metadata.total_chunks
        });

        if (filteredResults.length >= limit) break;
    }

    console.error('[DOCS-SEARCH] Found', filteredResults.length, 'results');

    return {
        query,
        total_results: filteredResults.length,
        results: filteredResults,
        search_type: 'semantic',
        filters: {
            file_path: file_path || 'all',
            category: category || 'all',
            doc_type: doc_type || 'all'
        }
    };
}

/**
 * Hybrid search combining semantic and keyword search
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function docsHybridSearch(params = {}) {
    const {
        query,
        file_path,
        category,
        doc_type,
        limit = 20,
        semantic_weight = 0.7
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[DOCS-SEARCH] Hybrid search for:', query);

    // Get semantic results
    const semanticResults = await docsSemanticSearch({
        query,
        file_path,
        category,
        doc_type,
        limit: limit * 2 // Get more for reranking
    });

    // Simple keyword matching for hybrid
    const keywords = query.toLowerCase().split(/\s+/);

    const hybridResults = semanticResults.results.map(result => {
        const text = result.text.toLowerCase();

        // Count keyword matches
        const keywordScore = keywords.reduce((score, keyword) => {
            const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
            return score + matches;
        }, 0) / keywords.length;

        // Normalize keyword score to 0-1 range
        const normalizedKeywordScore = Math.min(keywordScore / 5, 1);

        // Combine scores
        const hybridScore = (result.similarity * semantic_weight) + (normalizedKeywordScore * (1 - semantic_weight));

        return {
            ...result,
            keyword_score: normalizedKeywordScore,
            hybrid_score: hybridScore
        };
    });

    // Sort by hybrid score
    hybridResults.sort((a, b) => b.hybrid_score - a.hybrid_score);

    console.error('[DOCS-SEARCH] Hybrid search complete:', hybridResults.length, 'results');

    return {
        query,
        total_results: Math.min(hybridResults.length, limit),
        results: hybridResults.slice(0, limit),
        search_type: 'hybrid',
        weights: {
            semantic: semantic_weight,
            keyword: 1 - semantic_weight
        },
        filters: {
            file_path: file_path || 'all',
            category: category || 'all',
            doc_type: doc_type || 'all'
        }
    };
}

/**
 * Documentation search tools export
 */
export const docsSearchTools = {
    docs_semantic_search: {
        description: 'Semantic search in documentation using AI embeddings (finds docs by meaning, not just keywords)',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (what you want to find)'
                },
                file_path: {
                    type: 'string',
                    description: 'Filter by file path substring (optional)'
                },
                category: {
                    type: 'string',
                    description: 'Filter by category: tutorials, how-to, reference, explanation (optional)'
                },
                doc_type: {
                    type: 'string',
                    description: 'Filter by document type: architecture, guides, reference, tutorials (optional)'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default: 20)',
                    default: 20
                }
            },
            required: ['query']
        },
        handler: docsSemanticSearch
    },
    docs_hybrid_search: {
        description: 'Hybrid search in documentation combining semantic (meaning-based) and keyword matching',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                file_path: {
                    type: 'string',
                    description: 'Filter by file path substring (optional)'
                },
                category: {
                    type: 'string',
                    description: 'Filter by category: tutorials, how-to, reference, explanation (optional)'
                },
                doc_type: {
                    type: 'string',
                    description: 'Filter by document type: architecture, guides, reference, tutorials (optional)'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default: 20)',
                    default: 20
                },
                semantic_weight: {
                    type: 'number',
                    description: 'Weight for semantic vs keyword (0-1, default: 0.7)',
                    default: 0.7
                }
            },
            required: ['query']
        },
        handler: docsHybridSearch
    }
};
