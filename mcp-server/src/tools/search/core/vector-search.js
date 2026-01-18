import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {number} Similarity score (0-1)
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

/**
 * Perform vector search using cosine similarity
 * @param {Array<number>} queryVector - Query embedding vector
 * @param {Array<Object>} documents - Documents with embeddings
 * @param {number} limit - Maximum number of results
 * @returns {Array<Object>} Sorted search results
 */
export function vectorSearch(queryVector, documents, limit = 20) {
    const results = documents.map(doc => ({
        ...doc,
        similarity: cosineSimilarity(queryVector, doc.embedding)
    }));

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
}

/**
 * Load vector database from JSON file
 * @param {string} vectorDbPath - Path to vector database file
 * @returns {Promise<Array<Object>>} Loaded vectors
 */
export async function loadVectorDb(vectorDbPath) {
    if (!existsSync(vectorDbPath)) {
        throw new Error(`Vector database not found: ${vectorDbPath}`);
    }

    const data = await readFile(vectorDbPath, 'utf-8');
    const vectors = JSON.parse(data);

    // Normalize format: old Discord vectors use 'values', new ones use 'embedding'
    const normalizedVectors = vectors.map(v => {
        if (v.values && !v.embedding) {
            return { ...v, embedding: v.values };
        }
        return v;
    });

    console.error('[VECTOR-SEARCH] Loaded', normalizedVectors.length, 'vectors from', vectorDbPath);

    return normalizedVectors;
}

/**
 * Filter search results based on metadata criteria
 * @param {Array<Object>} results - Search results
 * @param {Object} filters - Filter criteria
 * @returns {Array<Object>} Filtered results
 */
export function filterResults(results, filters = {}) {
    return results.filter(result => {
        const metadata = result.metadata;

        // Apply each filter
        for (const [key, value] of Object.entries(filters)) {
            if (value === null || value === undefined) continue;
            if (metadata[key] !== value) return false;
        }

        return true;
    });
}

/**
 * Apply date range filter to results
 * @param {Array<Object>} results - Search results
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array<Object>} Filtered results
 */
export function filterByDateRange(results, startDate, endDate) {
    return results.filter(result => {
        const date = result.metadata.date;
        if (!date) return true;

        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;

        return true;
    });
}

/**
 * Format search results for output
 * @param {Array<Object>} results - Raw search results
 * @param {Object} options - Formatting options
 * @returns {Array<Object>} Formatted results
 */
export function formatResults(results, options = {}) {
    const { includeEmbedding = false, includeMetadata = true } = options;

    return results.map(result => {
        const formatted = {
            score: result.similarity,
            similarity: result.similarity
        };

        if (includeMetadata && result.metadata) {
            Object.assign(formatted, result.metadata);
        }

        if (includeEmbedding && result.embedding) {
            formatted.embedding = result.embedding;
        }

        return formatted;
    });
}
