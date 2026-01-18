#!/usr/bin/env node

/**
 * Index Documentation for Semantic Search
 * 
 * This script indexes all documentation files in the docs/ directory
 * and creates a vector database for semantic search.
 * 
 * Usage: npm run index-docs
 */

import { indexDocuments, saveVectorDb, chunkText } from '../src/tools/search/index.js';
import { readdir, readFile } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');
const DOCS_DIR = join(ROOT_DIR, 'docs');

/**
 * Determine document category based on file path
 */
function getDocCategory(filePath) {
    const relativePath = relative(DOCS_DIR, filePath).toLowerCase();

    if (relativePath.includes('tutorial')) return 'tutorials';
    if (relativePath.includes('how-to') || relativePath.includes('guides')) return 'how-to';
    if (relativePath.includes('reference')) return 'reference';
    if (relativePath.includes('explanation') || relativePath.includes('architecture')) return 'explanation';

    return 'other';
}

/**
 * Determine document type based on directory structure
 */
function getDocType(filePath) {
    const relativePath = relative(DOCS_DIR, filePath).toLowerCase();

    if (relativePath.startsWith('architecture')) return 'architecture';
    if (relativePath.startsWith('guides')) return 'guides';
    if (relativePath.startsWith('reference')) return 'reference';
    if (relativePath.startsWith('tutorials')) return 'tutorials';
    if (relativePath.startsWith('knowledge')) return 'knowledge';

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
 * Read all documentation files recursively
 */
async function readDocsFiles(dir, files = []) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip certain directories
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'archive') {
                continue;
            }
            await readDocsFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Process documentation files into indexable documents
 */
async function processDocsFiles(filePaths) {
    const documents = [];
    let totalChunks = 0;

    console.log(`Processing ${filePaths.length} documentation files...`);

    for (const filePath of filePaths) {
        const content = await readFile(filePath, 'utf-8');
        const relativePath = relative(ROOT_DIR, filePath);

        // Skip empty files
        if (content.trim().length === 0) {
            console.log(`  Skipping empty file: ${relativePath}`);
            continue;
        }

        // Extract metadata
        const category = getDocCategory(filePath);
        const docType = getDocType(filePath);
        const section = extractSection(content);

        // Chunk the content
        const chunks = chunkText(content, {
            chunkSize: 1000,
            chunkOverlap: 200,
            separator: '\n\n'
        });

        console.log(`  ${relativePath}: ${chunks.length} chunks (${category}/${docType})`);

        // Create document for each chunk
        chunks.forEach((chunk, index) => {
            documents.push({
                id: `${relativePath}_chunk_${index}`,
                text: chunk,
                metadata: {
                    text: chunk,
                    file_path: relativePath,
                    category: category,
                    doc_type: docType,
                    section: section,
                    chunk_index: index,
                    total_chunks: chunks.length
                }
            });
        });

        totalChunks += chunks.length;
    }

    console.log(`\nTotal: ${documents.length} document chunks from ${filePaths.length} files`);

    return documents;
}

/**
 * Main indexing function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('Documentation Indexing for Semantic Search');
    console.log('='.repeat(60));
    console.log();

    try {
        // Step 1: Read all documentation files
        console.log('Step 1: Reading documentation files...');
        const filePaths = await readDocsFiles(DOCS_DIR);
        console.log(`Found ${filePaths.length} markdown files\n`);

        if (filePaths.length === 0) {
            console.error('No documentation files found!');
            process.exit(1);
        }

        // Step 2: Process files into documents
        console.log('Step 2: Processing files into chunks...');
        const documents = await processDocsFiles(filePaths);
        console.log();

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
        const outputPath = join(ROOT_DIR, '.vector-db/docs/vectors.json');
        await saveVectorDb(vectors, outputPath);

        console.log();
        console.log('='.repeat(60));
        console.log('✅ Documentation indexing complete!');
        console.log('='.repeat(60));
        console.log();
        console.log('Summary:');
        console.log(`  Files processed: ${filePaths.length}`);
        console.log(`  Chunks created: ${documents.length}`);
        console.log(`  Vectors generated: ${vectors.length}`);
        console.log(`  Output: ${relative(ROOT_DIR, outputPath)}`);
        console.log();
        console.log('You can now use docs_semantic_search and docs_hybrid_search tools!');
        console.log();

    } catch (error) {
        console.error('\n❌ Error during indexing:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
main();
