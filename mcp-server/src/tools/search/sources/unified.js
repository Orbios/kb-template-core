import { generateEmbedding } from '../core/embeddings.js';
import { discordSearchTools } from './discord.js';
import { docsSearchTools } from './docs.js';
import { knowledgeSearchTools } from './knowledge.js';

/**
 * Unified search across all sources
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Aggregated search results
 */
async function unifiedSemanticSearch(params = {}) {
    const {
        query,
        sources = ['discord', 'docs', 'knowledge'], // Default: search all
        limit = 20
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[UNIFIED-SEARCH] Searching across sources:', sources.join(', '));

    const allResults = [];
    const sourceResults = {};
    const errors = {};

    // Search each source in parallel
    const searchPromises = [];

    if (sources.includes('discord')) {
        searchPromises.push(
            discordSearchTools.discord_semantic_search.handler({ query, limit })
                .then(result => {
                    sourceResults.discord = result;
                    return (result.results || []).map(r => ({ ...r, source: 'discord' }));
                })
                .catch(error => {
                    errors.discord = error.message;
                    return [];
                })
        );
    }

    if (sources.includes('docs')) {
        searchPromises.push(
            docsSearchTools.docs_semantic_search.handler({ query, limit })
                .then(result => {
                    sourceResults.docs = result;
                    return (result.results || []).map(r => ({ ...r, source: 'docs' }));
                })
                .catch(error => {
                    errors.docs = error.message;
                    return [];
                })
        );
    }

    if (sources.includes('knowledge')) {
        searchPromises.push(
            knowledgeSearchTools.knowledge_semantic_search.handler({ query, limit })
                .then(result => {
                    sourceResults.knowledge = result;
                    return (result.results || []).map(r => ({ ...r, source: 'knowledge' }));
                })
                .catch(error => {
                    errors.knowledge = error.message;
                    return [];
                })
        );
    }

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Combine and sort by score
    results.forEach(sourceResults => {
        allResults.push(...sourceResults);
    });

    // Sort by similarity score (descending)
    allResults.sort((a, b) => b.similarity - a.similarity);

    // Take top N results
    const topResults = allResults.slice(0, limit);

    console.error('[UNIFIED-SEARCH] Found', allResults.length, 'total results,', 'returning top', topResults.length);

    return {
        query,
        total_results: topResults.length,
        results: topResults,
        search_type: 'unified_semantic',
        sources_searched: sources,
        source_counts: {
            discord: sourceResults.discord?.total_results || 0,
            docs: sourceResults.docs?.total_results || 0,
            knowledge: sourceResults.knowledge?.total_results || 0
        },
        errors: Object.keys(errors).length > 0 ? errors : undefined
    };
}

/**
 * Unified hybrid search across all sources
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Aggregated search results
 */
async function unifiedHybridSearch(params = {}) {
    const {
        query,
        sources = ['discord', 'docs', 'knowledge'],
        limit = 20,
        semantic_weight = 0.7
    } = params;

    if (!query) {
        throw new Error('query is required');
    }

    console.error('[UNIFIED-SEARCH] Hybrid search across sources:', sources.join(', '));

    const allResults = [];
    const sourceResults = {};
    const errors = {};

    // Search each source in parallel
    const searchPromises = [];

    if (sources.includes('discord')) {
        searchPromises.push(
            discordSearchTools.discord_hybrid_search.handler({ query, limit, semantic_weight })
                .then(result => {
                    sourceResults.discord = result;
                    return (result.results || []).map(r => ({ ...r, source: 'discord' }));
                })
                .catch(error => {
                    errors.discord = error.message;
                    return [];
                })
        );
    }

    if (sources.includes('docs')) {
        searchPromises.push(
            docsSearchTools.docs_hybrid_search.handler({ query, limit, semantic_weight })
                .then(result => {
                    sourceResults.docs = result;
                    return (result.results || []).map(r => ({ ...r, source: 'docs' }));
                })
                .catch(error => {
                    errors.docs = error.message;
                    return [];
                })
        );
    }

    if (sources.includes('knowledge')) {
        searchPromises.push(
            knowledgeSearchTools.knowledge_hybrid_search.handler({ query, limit, semantic_weight })
                .then(result => {
                    sourceResults.knowledge = result;
                    return (result.results || []).map(r => ({ ...r, source: 'knowledge' }));
                })
                .catch(error => {
                    errors.knowledge = error.message;
                    return [];
                })
        );
    }

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Combine and sort by hybrid score
    results.forEach(sourceResults => {
        allResults.push(...sourceResults);
    });

    // Sort by hybrid score (descending)
    allResults.sort((a, b) => (b.hybrid_score || b.similarity) - (a.hybrid_score || a.similarity));

    // Take top N results
    const topResults = allResults.slice(0, limit);

    console.error('[UNIFIED-SEARCH] Found', allResults.length, 'total results,', 'returning top', topResults.length);

    return {
        query,
        total_results: topResults.length,
        results: topResults,
        search_type: 'unified_hybrid',
        sources_searched: sources,
        weights: {
            semantic: semantic_weight,
            keyword: 1 - semantic_weight
        },
        source_counts: {
            discord: sourceResults.discord?.total_results || 0,
            docs: sourceResults.docs?.total_results || 0,
            knowledge: sourceResults.knowledge?.total_results || 0
        },
        errors: Object.keys(errors).length > 0 ? errors : undefined
    };
}

/**
 * Unified search tools export
 */
export const unifiedSearchTools = {
    unified_semantic_search: {
        description: 'Search across ALL sources (discord, docs, knowledge) using semantic AI search',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (what you want to find)'
                },
                sources: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['discord', 'docs', 'knowledge']
                    },
                    description: 'Sources to search (default: all)',
                    default: ['discord', 'docs', 'knowledge']
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default: 20)',
                    default: 20
                }
            },
            required: ['query']
        },
        handler: unifiedSemanticSearch
    },
    unified_hybrid_search: {
        description: 'Search across ALL sources using hybrid (semantic + keyword) search',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query'
                },
                sources: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['discord', 'docs', 'knowledge']
                    },
                    description: 'Sources to search (default: all)',
                    default: ['discord', 'docs', 'knowledge']
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
        handler: unifiedHybridSearch
    }
};
