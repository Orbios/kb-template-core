// Discord Role IDs and KB Role Mapping
// Based on docs/architecture/auth-system.md

export const DISCORD_ROLES = {
    CORE_LEAD: '1446244355479306260',
    DEV_LEAD: '1446245005663535298',
    DEV: '1446245072290058260',
    OPEN: '1446245138612891658',
};

export const KB_ROLES = {
    ADMIN: 'admin',
    TEAM: 'team',
    MEMBER: 'member',
    PUBLIC: 'public',
};

export const ACCESS_LEVELS = {
    PRIVATE: 'private',
    CORE: 'core',
    TEAM: 'team',
    PUBLIC: 'public',
};

/**
 * Map Discord roles to KB role
 * @param {string[]} discordRoles - Array of Discord role IDs
 * @returns {string} KB role (admin, team, member, or public)
 */
export function mapDiscordRoleToKBRole(discordRoles) {
    if (!Array.isArray(discordRoles)) {
        return KB_ROLES.PUBLIC;
    }

    // Highest privilege wins
    if (discordRoles.includes(DISCORD_ROLES.CORE_LEAD)) {
        return KB_ROLES.ADMIN;
    }
    if (discordRoles.includes(DISCORD_ROLES.DEV_LEAD)) {
        return KB_ROLES.TEAM;
    }
    if (discordRoles.includes(DISCORD_ROLES.DEV)) {
        return KB_ROLES.MEMBER;
    }

    return KB_ROLES.PUBLIC;
}

/**
 * Get access level hierarchy for a KB role
 * @param {string} kbRole - KB role
 * @returns {string[]} Array of access levels the role can access
 */
export function getAccessLevelsForRole(kbRole) {
    switch (kbRole) {
        case KB_ROLES.ADMIN:
            return [ACCESS_LEVELS.PRIVATE, ACCESS_LEVELS.CORE, ACCESS_LEVELS.TEAM, ACCESS_LEVELS.PUBLIC];
        case KB_ROLES.TEAM:
            return [ACCESS_LEVELS.CORE, ACCESS_LEVELS.TEAM, ACCESS_LEVELS.PUBLIC];
        case KB_ROLES.MEMBER:
            return [ACCESS_LEVELS.TEAM, ACCESS_LEVELS.PUBLIC];
        case KB_ROLES.PUBLIC:
        default:
            return [ACCESS_LEVELS.PUBLIC];
    }
}

/**
 * Check if a role can access a specific level
 * @param {string} kbRole - KB role
 * @param {string} accessLevel - Access level to check
 * @returns {boolean}
 */
export function canAccessLevel(kbRole, accessLevel) {
    const allowedLevels = getAccessLevelsForRole(kbRole);
    return allowedLevels.includes(accessLevel);
}
