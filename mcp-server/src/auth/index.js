// Authentication Module Index
// Central export for all auth-related functionality

export {
    DISCORD_ROLES,
    KB_ROLES,
    ACCESS_LEVELS,
    mapDiscordRoleToKBRole,
    getAccessLevelsForRole,
    canAccessLevel
} from './discord-roles.js';

export {
    TOOL_PERMISSIONS,
    canUseTool,
    getToolFilter
} from './permissions.js';

export {
    authManager,
    initializeAuthContext
} from './auth-manager.js';

export {
    AuthorizationError,
    checkToolAuthorization,
    applyDataFilters,
    withAuth,
    logAuthEvent
} from './middleware.js';

export {
    hasuraAuth,
    authenticateViaHasura
} from './hasura-auth.js';
