// Hasura Integration for Authentication
// Updated for actual Orbios Hub database schema

import pg from 'pg';
const { Client } = pg;

/**
 * Hasura client for authentication queries
 */
class HasuraAuthClient {
    constructor() {
        this.config = {
            host: process.env.HASURA_HOST || 'localhost',
            port: parseInt(process.env.HASURA_PORT || '5432'),
            database: process.env.HASURA_DATABASE || 'orbios_hub',
            user: process.env.HASURA_USER || 'orbios',
            password: process.env.HASURA_PASSWORD,
        };

        this.client = null;
    }

    /**
     * Connect to Hasura database
     */
    async connect() {
        if (this.client) return;

        // Check if database configuration is available
        if (!this.config.password) {
            console.log('[Hasura Auth] Database not configured - using file-based authentication');
            return;
        }

        try {
            this.client = new Client(this.config);
            await this.client.connect();
            console.log('[Hasura Auth] Connected to database');
        } catch (error) {
            console.log('[Hasura Auth] Database connection failed - falling back to file-based authentication');
            console.log('[Hasura Auth] Error:', error.message);
            this.client = null;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    /**
     * Fetch user data from Discord user ID
     * @param {string} discordId - Discord user ID
     * @returns {Promise<Object|null>} User data with roles
     */
    async getUserData(discordId) {
        await this.connect();

        // If no database connection, return null (will fall back to file-based auth)
        if (!this.client) {
            return null;
        }

        try {
            // Query to fetch user and their roles from the actual schema
            const query = `
                SELECT 
                    u.id,
                    u.discord_id,
                    u.username,
                    u.email,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'role_id', r.id,
                                'role_name', r.role_name
                            )
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'::json
                    ) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.discord_id = $1
                GROUP BY u.id, u.discord_id, u.username, u.email
            `;

            const result = await this.client.query(query, [discordId]);

            if (result.rows.length === 0) {
                return null;
            }

            const userData = result.rows[0];

            // Parse roles JSON if it's a string
            if (typeof userData.roles === 'string') {
                userData.roles = JSON.parse(userData.roles);
            }

            // Map database roles to Discord-style role IDs for compatibility
            // This allows the existing RBAC system to work
            const discordRoleIds = this.mapDatabaseRolesToDiscordRoles(userData.roles);

            return {
                user_id: userData.discord_id,
                username: userData.username,
                email: userData.email,
                roles: discordRoleIds,
                db_roles: userData.roles, // Keep original for reference
            };
        } catch (error) {
            console.error('[Hasura Auth] Error fetching user data:', error.message);
            return null;
        }
    }

    /**
     * Map database role names to Discord role IDs
     * This maintains compatibility with the existing RBAC system
     * @param {Array} dbRoles - Array of {role_id, role_name} objects
     * @returns {string[]} Array of Discord role IDs
     */
    mapDatabaseRolesToDiscordRoles(dbRoles) {
        const DISCORD_ROLES = {
            CORE_LEAD: '1446244355479306260',
            DEV_LEAD: '1446245005663535298',
            DEV: '1446245072290058260',
            OPEN: '1446245138612891658',
        };

        const roleMapping = {
            'admin': DISCORD_ROLES.CORE_LEAD,
            'dev': DISCORD_ROLES.DEV,
            'member': DISCORD_ROLES.OPEN,
            'guest': DISCORD_ROLES.OPEN,
        };

        const discordRoles = [];

        for (const role of dbRoles) {
            const discordRole = roleMapping[role.role_name];
            if (discordRole && !discordRoles.includes(discordRole)) {
                discordRoles.push(discordRole);
            }
        }

        // If user has no roles, default to guest/open
        if (discordRoles.length === 0) {
            discordRoles.push(DISCORD_ROLES.OPEN);
        }

        return discordRoles;
    }

    /**
     * Verify user exists in database
     * @param {string} discordId - Discord user ID
     * @returns {Promise<boolean>}
     */
    async verifyUserExists(discordId) {
        await this.connect();

        // If no database connection, return false
        if (!this.client) {
            return false;
        }

        try {
            const query = `
                SELECT COUNT(*) as count
                FROM users
                WHERE discord_id = $1
            `;

            const result = await this.client.query(query, [discordId]);
            return parseInt(result.rows[0].count) > 0;
        } catch (error) {
            console.error('[Hasura Auth] Error verifying user:', error.message);
            return false;
        }
    }
}

// Singleton instance
export const hasuraAuth = new HasuraAuthClient();

/**
 * Authenticate user via Hasura
 * @param {string} discordId - Discord user ID
 * @returns {Promise<Object|null>} User data with roles
 */
export async function authenticateViaHasura(discordId) {
    if (!discordId) return null;

    try {
        const userData = await hasuraAuth.getUserData(discordId);

        if (!userData) {
            console.error(`[Hasura Auth] User not found: ${discordId}`);
            return null;
        }

        console.error('[Hasura Auth] User authenticated:', {
            discord_id: userData.user_id,
            username: userData.username,
            db_roles: userData.db_roles,
            mapped_roles: userData.roles
        });

        return userData;
    } catch (error) {
        console.error('[Hasura Auth] Authentication error:', error.message);
        return null;
    }
}
