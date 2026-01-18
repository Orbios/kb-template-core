#!/usr/bin/env node

/**
 * Generate JWT Secret for Hasura
 * Creates a secure 256-bit secret for JWT signing
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Generating JWT Secret for Hasura\n');

// Generate a secure 256-bit (32 byte) secret
const secret = crypto.randomBytes(32).toString('hex');

console.log('✅ Secret generated!\n');
console.log('JWT Secret (256-bit):');
console.log('━'.repeat(70));
console.log(secret);
console.log('━'.repeat(70));
console.log('');

// Create Hasura environment configuration
const hasuraConfig = `# Hasura JWT Configuration
# Add this to your Hasura docker-compose.yml or .env file

HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"${secret}"}
`;

console.log('Hasura Environment Variable:');
console.log('━'.repeat(70));
console.log(hasuraConfig);
console.log('━'.repeat(70));
console.log('');

// Save to .env.hasura file
const envPath = path.join(__dirname, '..', '.env.hasura');
fs.writeFileSync(envPath, hasuraConfig, 'utf8');

console.log(`✅ Saved to: ${envPath}\n`);

// Also update root .env if it exists
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnvPath)) {
    let rootEnv = fs.readFileSync(rootEnvPath, 'utf8');

    // Check if HASURA_JWT_SECRET already exists
    if (rootEnv.includes('HASURA_JWT_SECRET=')) {
        console.log('⚠️  HASURA_JWT_SECRET already exists in root .env');
        console.log('   Please update it manually if needed.\n');
    } else {
        // Append to root .env
        rootEnv += `\n# Hasura JWT Secret (for MCP server)\nHASURA_JWT_SECRET=${secret}\n`;
        fs.writeFileSync(rootEnvPath, rootEnv, 'utf8');
        console.log(`✅ Added HASURA_JWT_SECRET to: ${rootEnvPath}\n`);
    }
}

console.log('📋 Next Steps:\n');
console.log('1. SSH to do-sgp1-ops:');
console.log('   ssh do-sgp1-ops\n');
console.log('2. Edit Hasura configuration:');
console.log('   cd /path/to/hasura');
console.log('   nano docker-compose.yml  # or .env\n');
console.log('3. Add the environment variable shown above\n');
console.log('4. Restart Hasura:');
console.log('   docker-compose restart hasura\n');
console.log('5. Test JWT authentication:');
console.log('   node tests/test-jwt.js\n');

console.log('🔒 Security Notes:\n');
console.log('• Keep this secret safe - never commit to public repos');
console.log('• Use the same secret in both Hasura and MCP server');
console.log('• Rotate the secret periodically for security');
console.log('• If compromised, generate a new secret immediately\n');
