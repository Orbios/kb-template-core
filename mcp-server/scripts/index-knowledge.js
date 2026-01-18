#!/usr/bin/env node

/**
 * Index Knowledge Base for Semantic Search
 * 
 * This script indexes all knowledge base files in the docs/knowledge/ directory
 * and creates a vector database for semantic search.
 * 
 * Knowledge clusters:
 * - ai: AI-related knowledge and documentation
 * - company: Company information, processes, and culture
 * - rules: Rules, policies, and guidelines
 * - info-signals: Information signals and indicators
 * 
 * Usage: npm run index-knowledge
 */

import { indexDocuments, saveVectorDb, chunkText } from '../src/tools/search/index.js';
import { readdir, readFile } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');
const KNOWLEDGE_DIR = join(ROOT_DIR, 'context');

/**
 * Determine knowledge cluster from file path
 */
function getKnowledgeCluster(filePath) {
    const relativePath = relative(KNOWLEDGE_DIR, filePath);
    const parts = relativePath.split(/[/\\]/);

    if (parts.length === 0) return 'general';

    const cluster = parts[0].toLowerCase();

    // Map to known clusters
    if (cluster === 'ai') return 'ai';
    if (cluster === 'company') return 'company';
    if (cluster === 'rules') return 'rules';
    if (cluster === 'info-signals') return 'info-signals';
    if (cluster === 'discord') return null; // Skip discord (has its own index)

    return 'general';
}

/**
 * Extract section from markdown content (first heading)
 */
function extractSection(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Introduction';
}

/**
 * Read all knowledge base files recursively
 */
async function readKnowledgeFiles(dir, files = []) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip certain directories
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'discord') {
                continue;
            }
            await readKnowledgeFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Process knowledge base files into indexable documents
 */
async function processKnowledgeFiles(filePaths) {
    const documents = [];
    let totalChunks = 0;
    const clusterStats = {};

    console.log(`Processing ${filePaths.length} knowledge base files...`);

    for (const filePath of filePaths) {
        const content = await readFile(filePath, 'utf-8');
        const relativePath = relative(ROOT_DIR, filePath);

        // Skip empty files
        if (content.trim().length === 0) {
            console.log(`  Skipping empty file: ${relativePath}`);
            continue;
        }

        // Determine cluster
        const cluster = getKnowledgeCluster(filePath);

        // Skip if no cluster (e.g., discord files)
        if (!cluster) {
            console.log(`  Skipping: ${relativePath} (no cluster)`);
            continue;
        }

        // Extract metadata
        const section = extractSection(content);

        // Chunk the content
        const chunks = chunkText(content, {
            chunkSize: 1000,
            chunkOverlap: 200,
            separator: '\n\n'
        });

        console.log(`  ${relativePath}: ${chunks.length} chunks (${cluster})`);

        // Track cluster statistics
        if (!clusterStats[cluster]) {
            clusterStats[cluster] = { files: 0, chunks: 0 };
        }
        clusterStats[cluster].files++;
        clusterStats[cluster].chunks += chunks.length;

        // Create document for each chunk
        chunks.forEach((chunk, index) => {
            documents.push({
                id: `${relativePath}_chunk_${index}`,
                text: chunk,
                metadata: {
                    text: chunk,
                    file_path: relativePath,
                    cluster: cluster,
                    section: section,
                    chunk_index: index,
                    total_chunks: chunks.length
                }
            });
        });

        totalChunks += chunks.length;
    }

    console.log(`\nTotal: ${documents.length} document chunks from ${filePaths.length} files`);
    console.log('\nCluster breakdown:');
    for (const [cluster, stats] of Object.entries(clusterStats)) {
        console.log(`  ${cluster}: ${stats.files} files, ${stats.chunks} chunks`);
    }

    return documents;
}

/**
 * Main indexing function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('Knowledge Base Indexing for Semantic Search');
    console.log('='.repeat(60));
    console.log();

    try {
        // Step 1: Read all knowledge base files
        console.log('Step 1: Reading knowledge base files...');
        const filePaths = await readKnowledgeFiles(KNOWLEDGE_DIR);
        console.log(`Found ${filePaths.length} markdown files\n`);

        if (filePaths.length === 0) {
            console.error('No knowledge base files found!');
            process.exit(1);
        }

        // Step 2: Process files into documents
        console.log('Step 2: Processing files into chunks...');
        const documents = await processKnowledgeFiles(filePaths);
        console.log();

        if (documents.length === 0) {
            console.error('No documents to index!');
            process.exit(1);
        }

        // Step 3: Index documents (generate embeddings)
        console.log('Step 3: Generating embeddings...');
        console.log('This may take a few minutes...\n');

        const vectors = await indexDocuments(documents, {
            batchSize: 10,
            onProgress: (progress) => {
                const bar = '█'.repeat(Math.floor(progress.percentage / 2)) +
                    '░'.repeat(50 - Math.floor(progress.percentage / 2));
                process.stdout.write(`\r  Progress: [${bar}] ${progress.percentage}% (${progress.current}/${progress.total})`);
            }
        });

        console.log('\n');

        // Step 4: Save vector database
        console.log('Step 4: Saving vector database...');
        const outputPath = join(ROOT_DIR, '.vector-db/knowledge/vectors.json');
        await saveVectorDb(vectors, outputPath);

        console.log();
        console.log('='.repeat(60));
        console.log('✅ Knowledge base indexing complete!');
        console.log('='.repeat(60));
        console.log();
        console.log('Summary:');
        console.log(`  Files processed: ${filePaths.length}`);
        console.log(`  Chunks created: ${documents.length}`);
        console.log(`  Vectors generated: ${vectors.length}`);
        console.log(`  Output: ${relative(ROOT_DIR, outputPath)}`);
        console.log();
        console.log('You can now use knowledge_semantic_search and knowledge_hybrid_search tools!');
        console.log('You can also use unified_semantic_search to search across all sources!');
        console.log();

    } catch (error) {
        console.error('\n❌ Error during indexing:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
main();
