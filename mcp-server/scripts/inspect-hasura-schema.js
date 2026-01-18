#!/usr/bin/env node

/**
 * Hasura Database Schema Inspector
 * Connects to Hasura and shows the actual table structure
 * This helps us understand what tables/columns exist for auth
 */

import pg from 'pg';
const { Client } = pg;

async function inspectDatabase() {
    const client = new Client({
        host: process.env.HASURA_HOST,
        port: parseInt(process.env.HASURA_PORT || '5432'),
        database: process.env.HASURA_DATABASE || 'postgres',
        user: process.env.HASURA_USER || 'postgres',
        password: process.env.HASURA_PASSWORD,
    });

    try {
        console.log('🔍 Connecting to Hasura database...\n');
        await client.connect();
        console.log('✅ Connected!\n');

        // Get all tables
        console.log('📊 Tables in database:');
        console.log('======================\n');

        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;

        const tables = await client.query(tablesQuery);

        for (const row of tables.rows) {
            const tableName = row.table_name;
            console.log(`\n📋 Table: ${tableName}`);
            console.log('─'.repeat(50));

            // Get columns for this table
            const columnsQuery = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = $1
                ORDER BY ordinal_position;
            `;

            const columns = await client.query(columnsQuery, [tableName]);

            for (const col of columns.rows) {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  • ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
            }

            // Get row count
            try {
                const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
                const count = await client.query(countQuery);
                console.log(`\n  Rows: ${count.rows[0].count}`);
            } catch (e) {
                console.log(`\n  Rows: (unable to count)`);
            }
        }

        // Look for Discord-related tables specifically
        console.log('\n\n🔍 Discord-Related Tables:');
        console.log('==========================\n');

        const discordTables = tables.rows.filter(row =>
            row.table_name.includes('discord') ||
            row.table_name.includes('user') ||
            row.table_name.includes('guild') ||
            row.table_name.includes('member') ||
            row.table_name.includes('role')
        );

        if (discordTables.length > 0) {
            console.log('Found:', discordTables.map(t => t.table_name).join(', '));
        } else {
            console.log('⚠️  No Discord-related tables found');
            console.log('   This might mean:');
            console.log('   1. Tables use different naming');
            console.log('   2. Discord data is in a different schema');
            console.log('   3. Need to create auth tables');
        }

        // Sample a Discord message to see structure
        console.log('\n\n📝 Sample Discord Message (if exists):');
        console.log('======================================\n');

        try {
            const sampleQuery = `
                SELECT * FROM discord_messages 
                LIMIT 1;
            `;
            const sample = await client.query(sampleQuery);

            if (sample.rows.length > 0) {
                console.log(JSON.stringify(sample.rows[0], null, 2));
            } else {
                console.log('No messages found');
            }
        } catch (e) {
            console.log('⚠️  discord_messages table not found or not accessible');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nMake sure you have set:');
        console.error('  HASURA_HOST=your_server_ip');
        console.error('  HASURA_PASSWORD=your_password');
    } finally {
        await client.end();
        console.log('\n\n✅ Disconnected from database');
    }
}

// Check if env vars are set
if (!process.env.HASURA_HOST || !process.env.HASURA_PASSWORD) {
    console.error('❌ Missing required environment variables!');
    console.error('\nPlease set:');
    console.error('  export HASURA_HOST=your_server_ip');
    console.error('  export HASURA_PASSWORD=your_password');
    console.error('\nOptional:');
    console.error('  export HASURA_PORT=5432');
    console.error('  export HASURA_DATABASE=postgres');
    console.error('  export HASURA_USER=postgres');
    process.exit(1);
}

inspectDatabase();
