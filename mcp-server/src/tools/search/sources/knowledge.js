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
 * Knowledge clusters (categories)
 */
const KNOWLEDGE_CLUSTERS = {
    ai: 'AI-related knowledge and documentation',
    company: 'Company information, processes, and culture',
    rules: 'Rules, policies, and guidelines',
    'info-signals': 'Information signals and indicators'
};

/**
 * Initialize Knowledge Base vector database
 * @returns {Promise<Array<Object>>} Loaded vectors
 */
async function initializeKnowledgeVectors() {
    if (vectors) {
        return vectors;
    }

    // Get vector DB path from modules config
    if (!vectorDbPath) {
        vectorDbPath = await getVectorDbPath('context');
    }

    console.error('[KNOWLEDGE-SEARCH] Loading vectors from:', vectorDbPath);

    if (!existsSync(vectorDbPath)) {
        throw new Error(
            `Knowledge base vector database not initialized. Run: npm run index-knowledge\nPath: ${vectorDbPath}`
        );
    }

    vectors = await loadVectorDb(vectorDbPath);
    return vectors;
}

/**
 * Semantic search in knowledge base
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function knowledgeSemanticSearch(params = {}) {
    const {
        query,
        cluster,
        file_path,
        limit = 20
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[KNOWLEDGE-SEARCH] Semantic search for:', query, cluster ? `(cluster: ${cluster})` : '');

    // Initialize vectors
    const docs = await initializeKnowledgeVectors();

    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Perform vector search
    const searchResults = vectorSearch(queryVector, docs, limit * 2); // Get more for filtering

    // Filter results
    const filteredResults = [];
    for (const result of searchResults) {
        const metadata = result.metadata;

        // Apply filters
        if (cluster && metadata.cluster !== cluster) continue;
        if (file_path && !metadata.file_path.includes(file_path)) continue;

        filteredResults.push({
            text: metadata.text,
            score: result.similarity,
            similarity: result.similarity,
            file_path: metadata.file_path,
            cluster: metadata.cluster,
            section: metadata.section,
            chunk_index: metadata.chunk_index,
            total_chunks: metadata.total_chunks
        });

        if (filteredResults.length >= limit) break;
    }

    console.error('[KNOWLEDGE-SEARCH] Found', filteredResults.length, 'results');

    return {
        query,
        total_results: filteredResults.length,
        results: filteredResults,
        search_type: 'semantic',
        filters: {
            cluster: cluster || 'all',
            file_path: file_path || 'all'
        }
    };
}

/**
 * Hybrid search in knowledge base
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function knowledgeHybridSearch(params = {}) {
    const {
        query,
        cluster,
        file_path,
        limit = 20,
        semantic_weight = 0.7
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[KNOWLEDGE-SEARCH] Hybrid search for:', query);

    // Get semantic results
    const semanticResults = await knowledgeSemanticSearch({
        query,
        cluster,
        file_path,
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

    console.error('[KNOWLEDGE-SEARCH] Hybrid search complete:', hybridResults.length, 'results');

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
            cluster: cluster || 'all',
            file_path: file_path || 'all'
        }
    };
}

/**
 * Knowledge base search tools export
 */
export const knowledgeSearchTools = {
    knowledge_semantic_search: {
        description: 'Semantic search in knowledge base using AI embeddings (ai, company, rules, info-signals)',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (what you want to find)'
                },
                cluster: {
                    type: 'string',
                    enum: ['ai', 'company', 'rules', 'info-signals'],
                    description: 'Filter by knowledge cluster (optional)'
                },
                file_path: {
                    type: 'string',
                    description: 'Filter by file path substring (optional)'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default: 20)',
                    default: 20
                }
            },
            required: ['query']
        },
        handler: knowledgeSemanticSearch
    },
    knowledge_hybrid_search: {
        description: 'Hybrid search in knowledge base combining semantic and keyword matching',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                cluster: {
                    type: 'string',
                    enum: ['ai', 'company', 'rules', 'info-signals'],
                    description: 'Filter by knowledge cluster (optional)'
                },
                file_path: {
                    type: 'string',
                    description: 'Filter by file path substring (optional)'
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
        handler: knowledgeHybridSearch
    }
};
