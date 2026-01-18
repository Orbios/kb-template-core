import { discordSearchTools } from '../src/tools/search/sources/discord.js';

async function test() {
    try {
        console.log('Testing Discord semantic search...');
        const result = await discordSearchTools.discord_semantic_search.handler({
            query: 'test',
            limit: 5
        });
        console.log('Success!');
        console.log('Results:', result.total_results);
        console.log('First result:', result.results[0]);
    } catch (error) {
        console.error('Error occurred:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
}

test();
