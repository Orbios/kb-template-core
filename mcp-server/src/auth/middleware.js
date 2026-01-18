// Authentication Middleware for MCP Tools
// Intercepts tool calls and enforces RBAC

import fs from 'fs';
import path from 'path';
import { authManager } from './auth-manager.js';
import { canUseTool, getToolFilter } from './permissions.js';

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'AuthorizationError';
        this.details = details;
    }
}

/**
 * Check if user is authorized to use a tool
 * @param {string} toolName - Name of the tool being called
 * @throws {AuthorizationError} If user is not authorized
 */
export function checkToolAuthorization(toolName) {
    // Disabled for perimeter-based permissions
    return;
    /*
    const context = authManager.getContext();
    const kbRole = context.kbRole;

    // Check if user can use this tool
    if (!canUseTool(toolName, kbRole)) {
        throw new AuthorizationError(
            `Access denied: Role '${kbRole}' cannot use tool '${toolName}'`,
            {
                toolName,
                userRole: kbRole,
                userId: context.userId,
                authenticated: context.authenticated,
            }
        );
    }
    */
}

/**
 * Apply data filters to tool arguments based on user role
 * @param {string} toolName - Name of the tool
 * @param {Object} args - Tool arguments
 * @returns {Object} Modified arguments with filters applied
 */
export function applyDataFilters(toolName, args) {
    // Disabled for perimeter-based permissions - return args unmodified (equivalent to Admin/all access)
    return args;
    /*
    const context = authManager.getContext();
    const filter = getToolFilter(toolName, context.kbRole, context.userId);

    if (!filter) {
        return args;
    }

    // Clone args to avoid mutation
    const filteredArgs = { ...args };

    // Apply filter based on type
    switch (filter.type) {
        case 'all':
            // Admin - no filtering needed
            break;

        case 'team':
            // Team role - filter to team-level access
            filteredArgs._accessFilter = {
                levels: ['public', 'team', 'core'],
            };
            break;

        case 'assigned':
            // Member role - filter to assigned items only
            filteredArgs._accessFilter = {
                levels: ['public', 'team'],
                assignedTo: filter.userId,
            };
            break;

        case 'public':
            // Public role - only public data
            filteredArgs._accessFilter = {
                levels: ['public'],
            };
            break;

        default:
            // Unknown filter type - apply most restrictive
            filteredArgs._accessFilter = {
                levels: ['public'],
            };
    }

    return filteredArgs;
    */
}

/**
 * Middleware wrapper for tool handlers
 * Applies authorization checks and data filtering
 * @param {string} toolName - Name of the tool
 * @param {Function} handler - Original tool handler
 * @returns {Function} Wrapped handler with auth checks
 */
export function withAuth(toolName, handler) {
    return async (args) => {
        // Check authorization
        checkToolAuthorization(toolName);

        // Apply data filters
        const filteredArgs = applyDataFilters(toolName, args);

        // Call original handler
        return await handler(filteredArgs);
    };
}

/**
 * Log authorization event for audit trail
 * @param {string} toolName - Tool being accessed
 * @param {boolean} allowed - Whether access was allowed
 * @param {Object} details - Additional details
 */
export function logAuthEvent(toolName, allowed, details = {}) {
    const context = authManager.getContext();
    const timestamp = new Date().toISOString();

    const logEntry = {
        timestamp,
        toolName,
        allowed,
        userId: context.userId,
        username: context.username,
        kbRole: context.kbRole,
        authenticated: context.authenticated,
        ...details,
    };

    // In development, log to stderr
    console.error('[AUTH]', JSON.stringify(logEntry));

    // In production/agent usage, also log to file since stderr might be lost
    try {
        // Use absolute path for logs to ensure consistency
        const logDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, 'mcp-auth.log');
        // Synchronous write to ensure data is saved before process potentially exits
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
        console.error('[AUTH] Failed to write to log file:', err.message);
    }
}
