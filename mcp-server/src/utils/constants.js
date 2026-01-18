import { readKBFile } from './path-utils.js';

let constantsCache = null;

/**
 * Load constants from .ai/constants.json
 * @returns {Promise<Object>} Constants object
 */
export async function loadConstants() {
    if (constantsCache) {
        return constantsCache;
    }

    try {
        const content = await readKBFile('.ai/constants.json');
        constantsCache = JSON.parse(content);
        return constantsCache;
    } catch (error) {
        console.warn('Failed to load constants:', error.message);
        return {};
    }
}

/**
 * Get workflow triggers from constants
 * @returns {Promise<Object>} Workflow triggers
 */
export async function getWorkflowTriggers() {
    const constants = await loadConstants();
    return constants.workflow_triggers || {};
}

/**
 * Get allowed projects from constants
 * @returns {Promise<Array<string>>} Allowed projects
 */
export async function getAllowedProjects() {
    const constants = await loadConstants();
    return constants.allowed_projects || [];
}

/**
 * Clear constants cache (for testing)
 */
export function clearConstantsCache() {
    constantsCache = null;
}
