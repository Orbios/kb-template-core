// Authentication Context Manager
// Manages user authentication state for MCP server

import { mapDiscordRoleToKBRole } from './discord-roles.js';

/**
 * User authentication context
 * @typedef {Object} AuthContext
 * @property {string} userId - Discord user ID
 * @property {string} username - Discord username
 * @property {string[]} discordRoles - Array of Discord role IDs
 * @property {string} kbRole - Mapped KB role (admin, team, member, public)
 * @property {boolean} authenticated - Whether user is authenticated
 */

class AuthManager {
    constructor() {
        // In-memory session storage (for development)
        // In production, this would be backed by Redis or similar
        this.sessions = new Map();
        this.currentContext = null;
    }

    /**
     * Create authentication context from Discord user data
     * @param {Object} userData - Discord user data from Hasura
     * @returns {AuthContext}
     */
    createContext(userData) {
        if (!userData || !userData.user_id) {
            return this.getAnonymousContext();
        }

        const context = {
            userId: userData.user_id,
            username: userData.username || 'Unknown',
            discordRoles: userData.roles || [],
            kbRole: mapDiscordRoleToKBRole(userData.roles || []),
            authenticated: true,
        };

        return context;
    }

    /**
     * Get anonymous (unauthenticated) context
     * @returns {AuthContext}
     */
    getAnonymousContext() {
        return {
            userId: null,
            username: 'Anonymous',
            discordRoles: [],
            kbRole: 'public',
            authenticated: false,
        };
    }

    /**
     * Set current authentication context
     * @param {AuthContext} context
     */
    setContext(context) {
        this.currentContext = context;
    }

    /**
     * Get current authentication context
     * @returns {AuthContext}
     */
    getContext() {
        return this.currentContext || this.getAnonymousContext();
    }

    /**
     * Clear current context
     */
    clearContext() {
        this.currentContext = null;
    }

    /**
     * Check if current user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        const context = this.getContext();
        return context.authenticated;
    }

    /**
     * Get current user's KB role
     * @returns {string}
     */
    getCurrentRole() {
        const context = this.getContext();
        return context.kbRole;
    }

    /**
     * Get current user's ID
     * @returns {string|null}
     */
    getCurrentUserId() {
        const context = this.getContext();
        return context.userId;
    }
}

// Singleton instance
export const authManager = new AuthManager();

/**
 * Initialize auth context from environment or request metadata
 * This is called at the start of each MCP request
 * @param {Object} metadata - Request metadata
 * @returns {AuthContext}
 */
export async function initializeAuthContext(metadata = {}) {
    const userId = process.env.ORBIOS_USER_ID;

    if (!userId) {
        // No user ID - anonymous access
        const context = authManager.getAnonymousContext();
        authManager.setContext(context);
        return context;
    }

    // Try Hasura authentication first (if configured)
    if (process.env.HASURA_HOST && process.env.HASURA_PASSWORD) {
        try {
            // Dynamic import to avoid loading if not needed
            const { authenticateViaHasura } = await import('./hasura-auth.js');

            const userData = await authenticateViaHasura(userId);
            if (userData) {
                console.error('[Auth] Authenticated via Hasura:', {
                    userId: userData.user_id,
                    username: userData.username,
                    roles: userData.roles
                });

                const context = authManager.createContext(userData);
                authManager.setContext(context);
                return context;
            } else {
                console.error('[Auth] Hasura auth failed for user:', userId);
            }
        } catch (error) {
            console.error('[Auth] Hasura auth error, falling back to env:', error.message);
        }
    }

    // Fallback to environment variables (development mode)
    const userRoles = process.env.ORBIOS_USER_ROLES
        ? process.env.ORBIOS_USER_ROLES.split(',').map(r => r.trim())
        : [];

    console.error('[Auth] Using environment-based auth:', {
        userId,
        username: process.env.ORBIOS_USERNAME || userId,
        roles: userRoles
    });

    const context = authManager.createContext({
        user_id: userId,
        username: process.env.ORBIOS_USERNAME || userId,
        roles: userRoles,
    });

    authManager.setContext(context);
    return context;
}
