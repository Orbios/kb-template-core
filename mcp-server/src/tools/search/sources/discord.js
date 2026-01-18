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
 * Initialize Discord vector database
 * @returns {Promise<Array<Object>>} Loaded vectors
 */
async function initializeDiscordVectors() {
    if (vectors) {
        return vectors;
    }

    // Get vector DB path from modules config
    if (!vectorDbPath) {
        vectorDbPath = await getVectorDbPath('discord');
    }

    console.error('[DISCORD-SEARCH] Loading vectors from:', vectorDbPath);

    if (!existsSync(vectorDbPath)) {
        throw new Error(
            `Discord vector database not initialized. Run: npm run index-discord\nPath: ${vectorDbPath}`
        );
    }

    vectors = await loadVectorDb(vectorDbPath);
    return vectors;
}

/**
 * Semantic search in Discord messages
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function discordSemanticSearch(params = {}) {
    const {
        query,
        server_id,
        channel_id,
        author,
        start_date,
        end_date,
        limit = 20
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[DISCORD-SEARCH] Semantic search for:', query);

    // Initialize vectors
    const docs = await initializeDiscordVectors();

    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Perform vector search
    const searchResults = vectorSearch(queryVector, docs, limit * 2); // Get more for filtering

    // Filter results
    const filteredResults = [];
    for (const result of searchResults) {
        const metadata = result.metadata;

        // Apply filters
        if (server_id && metadata.server_id !== server_id) continue;
        if (channel_id && metadata.channel_id !== channel_id) continue;
        if (author && metadata.author !== author) continue;
        if (start_date && metadata.date < start_date) continue;
        if (end_date && metadata.date > end_date) continue;

        filteredResults.push({
            text: metadata.text,
            score: result.similarity,
            similarity: result.similarity,
            server_id: metadata.server_id,
            channel_id: metadata.channel_id,
            author: metadata.author,
            date: metadata.date,
            time: metadata.time,
            message_id: metadata.message_id
        });

        if (filteredResults.length >= limit) break;
    }

    console.error('[DISCORD-SEARCH] Found', filteredResults.length, 'results');

    return {
        query,
        total_results: filteredResults.length,
        results: filteredResults,
        search_type: 'semantic',
        filters: {
            server_id: server_id || 'all',
            channel_id: channel_id || 'all',
            author: author || 'all',
            date_range: start_date && end_date ? `${start_date} to ${end_date}` : 'all'
        }
    };
}

/**
 * Hybrid search combining semantic and keyword search
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function discordHybridSearch(params = {}) {
    const {
        query,
        server_id,
        channel_id,
        author,
        start_date,
        end_date,
        limit = 20,
        semantic_weight = 0.7
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[DISCORD-SEARCH] Hybrid search for:', query);

    // Get semantic results
    const semanticResults = await discordSemanticSearch({
        query,
        server_id,
        channel_id,
        author,
        start_date,
        end_date,
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

    console.error('[DISCORD-SEARCH] Hybrid search complete:', hybridResults.length, 'results');

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
            server_id: server_id || 'all',
            channel_id: channel_id || 'all',
            author: author || 'all',
            date_range: start_date && end_date ? `${start_date} to ${end_date}` : 'all'
        }
    };
}

/**
 * Discord search tools export
 */
export const discordSearchTools = {
    discord_semantic_search: {
        description: 'Semantic search in Discord messages using AI embeddings (finds messages by meaning, not just keywords)',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (what you want to find)'
                },
                server_id: {
                    type: 'string',
                    description: 'Discord server ID (optional)'
                },
                channel_id: {
                    type: 'string',
                    description: 'Discord channel ID (optional)'
                },
                author: {
                    type: 'string',
                    description: 'Filter by message author (optional)'
                },
                start_date: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD (optional)'
                },
                end_date: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD (optional)'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default: 20)',
                    default: 20
                }
            },
            required: ['query']
        },
        handler: discordSemanticSearch
    },
    discord_hybrid_search: {
        description: 'Hybrid search combining semantic (meaning-based) and keyword matching for best results',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                server_id: {
                    type: 'string',
                    description: 'Discord server ID (optional)'
                },
                channel_id: {
                    type: 'string',
                    description: 'Discord channel ID (optional)'
                },
                author: {
                    type: 'string',
                    description: 'Filter by message author (optional)'
                },
                start_date: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD (optional)'
                },
                end_date: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD (optional)'
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
        handler: discordHybridSearch
    }
};
