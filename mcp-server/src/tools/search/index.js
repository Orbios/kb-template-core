/**
 * Orbios KB Semantic Search Tools
 * 
 * This module provides semantic search capabilities across different data sources
 * using a shared core infrastructure with source-specific implementations.
 * 
 * Architecture:
 * - core/: Shared embedding, vector search, and indexing logic
 * - sources/: Source-specific search implementations
 * 
 * Available sources:
 * - discord: Discord messages
 * - docs: Documentation
 * - knowledge: Knowledge base (ai, company, rules, info-signals)
 * - unified: Search across all sources
 * 
 * Each source provides:
 * - {source}_semantic_search: AI-powered semantic search
 * - {source}_hybrid_search: Combined semantic + keyword search
 */

import { discordSearchTools } from './sources/discord.js';
import { docsSearchTools } from './sources/docs.js';
import { knowledgeSearchTools } from './sources/knowledge.js';
import { unifiedSearchTools } from './sources/unified.js';

/**
 * Export all search tools
 */
export const searchTools = {
    ...discordSearchTools,
    ...docsSearchTools,
    ...knowledgeSearchTools,
    ...unifiedSearchTools
};

/**
 * Export core utilities for use in indexing scripts
 */
export { generateEmbedding, generateEmbeddings, initializeEmbedder } from './core/embeddings.js';
export { vectorSearch, loadVectorDb, filterResults, filterByDateRange } from './core/vector-search.js';
export { indexDocuments, saveVectorDb, chunkText, incrementalIndex } from './core/indexer.js';
