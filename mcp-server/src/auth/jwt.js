// JWT Token Generation for Hasura
// Generates Hasura-compatible JWT tokens with role claims

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env');
if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
}

// JWT Secret (must match Hasura JWT secret)
// Validation is lazy - only checked when JWT functions are actually used
const JWT_SECRET = process.env.HASURA_JWT_SECRET;

/**
 * Validate that JWT secret is configured
 * @throws {Error} If HASURA_JWT_SECRET is not set
 */
function validateJWTSecret() {
    if (!JWT_SECRET) {
        throw new Error(
            'HASURA_JWT_SECRET environment variable is not set.\n' +
            'This is required for Hasura database authentication.\n' +
            'Run: node scripts/generate-jwt-secret.js\n' +
            'Or use file-based authentication by setting ORBIOS_USER_ID in .env'
        );
    }
}

// Token expiry (24 hours)
const TOKEN_EXPIRY = '24h';

/**
 * Generate Hasura-compatible JWT token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - Discord user ID
 * @param {string} payload.role - Hasura role (admin, team, member, public)
 * @param {string[]} payload.allowedRoles - List of allowed roles
 * @returns {string} Signed JWT token
 */
export function generateHasuraJWT({ userId, role, allowedRoles = [] }) {
    validateJWTSecret();

    // Ensure allowedRoles includes the current role
    if (!allowedRoles.includes(role)) {
        allowedRoles = [role, ...allowedRoles];
    }

    // Always include 'public' as fallback
    if (!allowedRoles.includes('public')) {
        allowedRoles.push('public');
    }

    const payload = {
        // Standard JWT claims
        sub: userId,
        iat: Math.floor(Date.now() / 1000) - 60, // Subtract 60s for clock skew

        // Hasura-specific claims
        'https://hasura.io/jwt/claims': {
            'x-hasura-allowed-roles': allowedRoles,
            'x-hasura-default-role': role,
            'x-hasura-user-id': userId,
        }
    };

    // Sign and return token
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: TOKEN_EXPIRY
    });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyHasuraJWT(token) {
    validateJWTSecret();

    try {
        return jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256']
        });
    } catch (error) {
        throw new Error(`Invalid JWT: ${error.message}`);
    }
}

/**
 * Generate JWT for a user based on their Discord ID
 * Fetches user roles from database and generates appropriate token
 * @param {string} discordId - Discord user ID
 * @returns {Promise<string>} JWT token
 */
export async function generateTokenForUser(discordId) {
    // Import here to avoid circular dependency
    const { authenticateViaHasura } = await import('./hasura-auth.js');
    const { mapDiscordRoleToKBRole } = await import('./discord-roles.js');

    // Fetch user data from database
    const userData = await authenticateViaHasura(discordId);

    if (!userData) {
        // User not in database - give public access
        return generateHasuraJWT({
            userId: discordId,
            role: 'public',
            allowedRoles: ['public']
        });
    }

    // Map database roles to Hasura role
    const hasuraRole = mapDiscordRoleToKBRole(userData.roles);

    // Determine allowed roles based on hierarchy
    const allowedRoles = getAllowedRoles(hasuraRole);

    return generateHasuraJWT({
        userId: discordId,
        role: hasuraRole,
        allowedRoles
    });
}

/**
 * Get allowed roles based on user's primary role
 * Implements role hierarchy (admin > team > member > public)
 * @param {string} primaryRole - User's primary role
 * @returns {string[]} List of allowed roles
 */
function getAllowedRoles(primaryRole) {
    const roleHierarchy = {
        'admin': ['admin', 'team', 'member', 'public'],
        'team': ['team', 'member', 'public'],
        'member': ['member', 'public'],
        'public': ['public']
    };

    return roleHierarchy[primaryRole] || ['public'];
}

/**
 * Extract user ID from JWT token
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null if invalid
 */
export function getUserIdFromToken(token) {
    try {
        const decoded = verifyHasuraJWT(token);
        return decoded['https://hasura.io/jwt/claims']['x-hasura-user-id'];
    } catch (error) {
        return null;
    }
}

/**
 * Extract role from JWT token
 * @param {string} token - JWT token
 * @returns {string|null} Role or null if invalid
 */
export function getRoleFromToken(token) {
    try {
        const decoded = verifyHasuraJWT(token);
        return decoded['https://hasura.io/jwt/claims']['x-hasura-default-role'];
    } catch (error) {
        return null;
    }
}
