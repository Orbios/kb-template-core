/**
 * Search Tools - Main Export
 * 
 * This file maintains backward compatibility while using the new modular search architecture.
 * All search functionality has been refactored into:
 * - search/core/: Shared infrastructure (embeddings, vector search, indexing)
 * - search/sources/: Source-specific implementations (discord, docs, knowledge, missions)
 * 
 * @deprecated Direct imports from this file - use search/index.js instead
 */

export { searchTools } from './search/index.js';
