#!/usr/bin/env node

/**
 * Test Semantic Search Tools
 * 
 * This script tests all semantic search tools to ensure they're working correctly.
 * 
 * Usage: npm run test-search
 */

import { searchTools } from '../src/tools/search/index.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Change to project root directory
process.chdir(join(__dirname, '../..'));

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, ...args) {
    console.log(color, ...args, COLORS.reset);
}

async function testTool(toolName, params) {
    try {
        log(COLORS.cyan, `\n🔍 Testing: ${toolName}`);
        log(COLORS.blue, `   Query: "${params.query}"`);

        const tool = searchTools[toolName];
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        const startTime = Date.now();
        const result = await tool.handler(params);
        const duration = Date.now() - startTime;

        log(COLORS.green, `   ✅ Success! Found ${result.total_results} results in ${duration}ms`);

        if (result.results && result.results.length > 0) {
            const topResult = result.results[0];
            log(COLORS.blue, `   📄 Top result (score: ${topResult.similarity?.toFixed(3) || topResult.score?.toFixed(3)}):`);
            log(COLORS.blue, `      ${topResult.text?.substring(0, 100)}...`);

            // Show source-specific metadata
            if (topResult.source) {
                log(COLORS.blue, `      Source: ${topResult.source}`);
            }
            if (topResult.cluster) {
                log(COLORS.blue, `      Cluster: ${topResult.cluster}`);
            }
            if (topResult.channel_id) {
                log(COLORS.blue, `      Channel: ${topResult.channel_id}`);
            }
            if (topResult.file_path) {
                log(COLORS.blue, `      File: ${topResult.file_path}`);
            }
        }

        return { success: true, duration, results: result.total_results };
    } catch (error) {
        log(COLORS.red, `   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('='.repeat(70));
    log(COLORS.cyan, '🧪 Semantic Search Tools Test Suite');
    console.log('='.repeat(70));

    const testResults = [];

    // Test 1: Discord Semantic Search
    testResults.push(await testTool('discord_semantic_search', {
        query: 'deployment process',
        limit: 5
    }));

    // Test 2: Discord Hybrid Search
    testResults.push(await testTool('discord_hybrid_search', {
        query: 'API authentication',
        limit: 5,
        semantic_weight: 0.7
    }));

    // Test 3: Docs Semantic Search
    testResults.push(await testTool('docs_semantic_search', {
        query: 'architecture patterns',
        limit: 5
    }));

    // Test 4: Docs Hybrid Search
    testResults.push(await testTool('docs_hybrid_search', {
        query: 'how to setup',
        doc_type: 'guides',
        limit: 5
    }));

    // Test 5: Knowledge Semantic Search
    testResults.push(await testTool('knowledge_semantic_search', {
        query: 'company culture',
        limit: 5
    }));

    // Test 6: Knowledge Hybrid Search (AI cluster)
    testResults.push(await testTool('knowledge_hybrid_search', {
        query: 'machine learning',
        cluster: 'ai',
        limit: 5
    }));

    // Test 7: Unified Semantic Search (All sources)
    testResults.push(await testTool('unified_semantic_search', {
        query: 'project management',
        sources: ['discord', 'docs', 'knowledge'],
        limit: 10
    }));

    // Test 8: Unified Hybrid Search (Selected sources)
    testResults.push(await testTool('unified_hybrid_search', {
        query: 'deployment guide',
        sources: ['docs', 'knowledge'],
        limit: 10
    }));

    // Summary
    console.log('\n' + '='.repeat(70));
    log(COLORS.cyan, '📊 Test Summary');
    console.log('='.repeat(70));

    const successful = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = totalDuration / successful;

    log(COLORS.green, `✅ Passed: ${successful}/${testResults.length}`);
    if (failed > 0) {
        log(COLORS.red, `❌ Failed: ${failed}/${testResults.length}`);
    }
    log(COLORS.blue, `⏱️  Average response time: ${avgDuration.toFixed(0)}ms`);
    log(COLORS.blue, `⏱️  Total test time: ${totalDuration.toFixed(0)}ms`);

    // List failed tests
    if (failed > 0) {
        console.log('\n' + '='.repeat(70));
        log(COLORS.red, '❌ Failed Tests:');
        testResults.forEach((result, index) => {
            if (!result.success) {
                log(COLORS.red, `   ${index + 1}. ${result.error}`);
            }
        });
    }

    console.log('\n' + '='.repeat(70));

    if (failed === 0) {
        log(COLORS.green, '🎉 All tests passed!');
        console.log('='.repeat(70));
        process.exit(0);
    } else {
        log(COLORS.red, '⚠️  Some tests failed. Check the errors above.');
        console.log('='.repeat(70));
        process.exit(1);
    }
}

main().catch(error => {
    log(COLORS.red, '\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
});
