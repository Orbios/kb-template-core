import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { generateEmbeddings } from './embeddings.js';

/**
 * Create vector database from documents
 * @param {Array<Object>} documents - Documents to index
 * @param {Object} options - Indexing options
 * @returns {Promise<Array<Object>>} Indexed vectors
 */
export async function indexDocuments(documents, options = {}) {
    const { batchSize = 10, onProgress = null } = options;

    console.error('[INDEXER] Indexing', documents.length, 'documents');

    const vectors = [];
    const batches = Math.ceil(documents.length / batchSize);

    for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, documents.length);
        const batch = documents.slice(start, end);

        console.error(`[INDEXER] Processing batch ${i + 1}/${batches} (${batch.length} documents)`);

        // Extract texts to embed
        const texts = batch.map(doc => doc.text);

        // Generate embeddings
        const embeddings = await generateEmbeddings(texts);

        // Combine with metadata
        for (let j = 0; j < batch.length; j++) {
            vectors.push({
                id: batch[j].id || `doc_${start + j}`,
                embedding: embeddings[j],
                metadata: batch[j].metadata || {}
            });
        }

        if (onProgress) {
            onProgress({
                current: end,
                total: documents.length,
                percentage: Math.round((end / documents.length) * 100)
            });
        }
    }

    console.error('[INDEXER] Indexing complete:', vectors.length, 'vectors created');

    return vectors;
}

/**
 * Save vector database to JSON file
 * @param {Array<Object>} vectors - Vectors to save
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
export async function saveVectorDb(vectors, outputPath) {
    // Ensure directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }

    // Save vectors
    await writeFile(outputPath, JSON.stringify(vectors, null, 2), 'utf-8');

    console.error('[INDEXER] Saved', vectors.length, 'vectors to', outputPath);

    // Save metadata
    const metadataPath = outputPath.replace('vectors.json', 'metadata.json');
    const metadata = {
        indexed_at: new Date().toISOString(),
        total_vectors: vectors.length,
        embedding_model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384
    };

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.error('[INDEXER] Saved metadata to', metadataPath);
}

/**
 * Chunk text into smaller pieces for embedding
 * @param {string} text - Text to chunk
 * @param {Object} options - Chunking options
 * @returns {Array<string>} Text chunks
 */
export function chunkText(text, options = {}) {
    const {
        chunkSize = 1000,
        chunkOverlap = 200,
        separator = '\n\n'
    } = options;

    // Split by separator first
    const sections = text.split(separator);
    const chunks = [];
    let currentChunk = '';

    for (const section of sections) {
        // If section is too large, split it further
        if (section.length > chunkSize) {
            // Save current chunk if it exists
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            // Split large section by sentences
            const sentences = section.match(/[^.!?]+[.!?]+/g) || [section];
            for (const sentence of sentences) {
                if (currentChunk.length + sentence.length > chunkSize) {
                    if (currentChunk) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = sentence;
                } else {
                    currentChunk += sentence;
                }
            }
        } else {
            // Add section to current chunk
            if (currentChunk.length + section.length > chunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = section;
            } else {
                currentChunk += (currentChunk ? separator : '') + section;
            }
        }
    }

    // Add remaining chunk
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Create incremental index (add new documents to existing index)
 * @param {Array<Object>} existingVectors - Existing vectors
 * @param {Array<Object>} newDocuments - New documents to add
 * @returns {Promise<Array<Object>>} Updated vectors
 */
export async function incrementalIndex(existingVectors, newDocuments) {
    console.error('[INDEXER] Incremental indexing:', newDocuments.length, 'new documents');

    const newVectors = await indexDocuments(newDocuments);
    const combined = [...existingVectors, ...newVectors];

    console.error('[INDEXER] Total vectors:', combined.length);

    return combined;
}
