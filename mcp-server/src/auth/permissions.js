// Tool Permission Definitions
// Based on docs/architecture/auth-system.md

import { KB_ROLES } from './discord-roles.js';

/**
 * Tool permission matrix
 * Structure:
 * - boolean: simple allow/deny
 * - object with filter: allowed with data filtering
 * - null/undefined: denied
 */
export const TOOL_PERMISSIONS = {
    // Mission Tools
    missions_create: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    missions_read: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'assigned' },
        [KB_ROLES.PUBLIC]: false,
    },
    missions_update: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    missions_list: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'assigned' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    missions_scan_context: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    missions_link_discord_channel: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    missions_import_discord_context: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    missions_generate_discord_summary: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },

    // Team Tools
    team_user_profile_create: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: false,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    team_daily_status_create: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    team_daily_tasks_create: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    team_availability_create: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    hr_candidate_save: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: false,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },

    // GraphQL Tools
    graphql_introspect_schema: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: false,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    graphql_query: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: false,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },

    // Discord Tools
    discord_check_updates: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    discord_pull_updates: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    discord_trigger_sync: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: false,
        [KB_ROLES.MEMBER]: false,
        [KB_ROLES.PUBLIC]: false,
    },
    discord_channel_summary: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    discord_user_mentions: {
        [KB_ROLES.ADMIN]: true,
        [KB_ROLES.TEAM]: true,
        [KB_ROLES.MEMBER]: true,
        [KB_ROLES.PUBLIC]: false,
    },
    discord_search_messages: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'assigned' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },

    // Search Tools
    discord_semantic_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'assigned' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    discord_hybrid_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'assigned' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    docs_semantic_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    docs_hybrid_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    knowledge_semantic_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    knowledge_hybrid_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    unified_semantic_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
    unified_hybrid_search: {
        [KB_ROLES.ADMIN]: { filter: 'all' },
        [KB_ROLES.TEAM]: { filter: 'team' },
        [KB_ROLES.MEMBER]: { filter: 'public' },
        [KB_ROLES.PUBLIC]: { filter: 'public' },
    },
};

/**
 * Check if a user can execute a tool
 * @param {string} toolName - Name of the tool
 * @param {string} kbRole - User's KB role
 * @returns {boolean}
 */
export function canUseTool(toolName, kbRole) {
    const permission = TOOL_PERMISSIONS[toolName];
    if (!permission) {
        // Unknown tool - deny by default
        return false;
    }

    const rolePermission = permission[kbRole];

    // Boolean permission
    if (typeof rolePermission === 'boolean') {
        return rolePermission;
    }

    // Object permission (with filter) means allowed
    if (typeof rolePermission === 'object' && rolePermission !== null) {
        return true;
    }

    // Null, undefined, or other = denied
    return false;
}

/**
 * Get data filter for a tool based on user role
 * @param {string} toolName - Name of the tool
 * @param {string} kbRole - User's KB role
 * @param {string} userId - User's ID (for personalized filters)
 * @returns {object|null} Filter configuration or null
 */
export function getToolFilter(toolName, kbRole, userId) {
    const permission = TOOL_PERMISSIONS[toolName];
    if (!permission) return null;

    const rolePermission = permission[kbRole];

    if (typeof rolePermission === 'object' && rolePermission !== null) {
        return {
            type: rolePermission.filter,
            userId: userId
        };
    }

    return null;
}
