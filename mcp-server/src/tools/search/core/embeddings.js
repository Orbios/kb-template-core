import { pipeline } from '@xenova/transformers';

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384;

let embedder = null;

/**
 * Initialize the embedding model
 * @returns {Promise<Object>} Initialized embedder
 */
export async function initializeEmbedder() {
    if (embedder) {
        return embedder;
    }

    console.error('[EMBEDDINGS] Loading embedding model:', EMBEDDING_MODEL);
    embedder = await pipeline('feature-extraction', EMBEDDING_MODEL);
    console.error('[EMBEDDINGS] Embedding model loaded');

    return embedder;
}

/**
 * Generate embedding for a text query
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} Embedding vector
 */
export async function generateEmbedding(text) {
    const model = await initializeEmbedder();
    const embedding = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(embedding.data);
}

/**
 * Generate embeddings for multiple texts
 * @param {Array<string>} texts - Texts to embed
 * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
    const model = await initializeEmbedder();
    const embeddings = [];

    for (const text of texts) {
        const embedding = await model(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(embedding.data));
    }

    return embeddings;
}

/**
 * Get embedding model configuration
 * @returns {Object} Model configuration
 */
export function getEmbeddingConfig() {
    return {
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS
    };
}
