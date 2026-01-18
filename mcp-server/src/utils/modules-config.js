import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let modulesConfig = null;

/**
 * Load modules configuration
 */
async function loadModulesConfig() {
    if (modulesConfig) return modulesConfig;

    const configPath = join(__dirname, '../../../.tf/modules-config.json');
    const content = await readFile(configPath, 'utf-8');
    modulesConfig = JSON.parse(content);

    return modulesConfig;
}

/**
 * Resolve path alias if it exists
 * @param {string} path - Path that might be an alias
 * @returns {Promise<string>} Resolved path
 */
async function resolvePathAlias(path) {
    const config = await loadModulesConfig();

    if (config.pathAliases && config.pathAliases[path]) {
        return config.pathAliases[path];
    }

    return path;
}

/**
 * Get data source path from modules config
 * @param {string} moduleId - Module identifier (e.g., 'context', 'missions', 'discord')
 * @returns {Promise<string>} Resolved path
 */
export async function getModulePath(moduleId) {
    const config = await loadModulesConfig();

    // Find module in config
    const module = config.modules.find(m => m.moduleId === moduleId && m.enabled);

    if (!module) {
        const availableModules = config.modules
            .filter(m => m.enabled)
            .map(m => m.moduleId)
            .join(', ');
        throw new Error(
            `Module '${moduleId}' not found or not enabled in modules-config.json. ` +
            `Available modules: ${availableModules}`
        );
    }

    // Resolve any path aliases
    return await resolvePathAlias(module.dataSource.path);
}

/**
 * Get data source configuration
 * @param {string} moduleId - Module identifier
 * @returns {Promise<Object>} Data source config
 */
export async function getDataSourceConfig(moduleId) {
    const config = await loadModulesConfig();

    const module = config.modules.find(m => m.moduleId === moduleId && m.enabled);

    if (!module) {
        throw new Error(`Module '${moduleId}' not found or not enabled`);
    }

    // Resolve path alias in the returned config
    const dataSource = { ...module.dataSource };
    dataSource.path = await resolvePathAlias(dataSource.path);

    return dataSource;
}

/**
 * Resolve KB path using modules config
 * @param {string} moduleId - Module ID (e.g., 'context', 'missions', 'discord')
 * @param {...string} paths - Additional path segments
 * @returns {Promise<string>} Absolute path
 */
export async function resolveKBPath(moduleId, ...paths) {
    const kbRoot = join(__dirname, '../..');

    // Try to resolve as path alias first
    const resolvedAlias = await resolvePathAlias(moduleId);
    if (resolvedAlias !== moduleId) {
        return join(kbRoot, resolvedAlias, ...paths);
    }

    // If moduleId looks like a module identifier (not a path)
    if (!moduleId.includes('/')) {
        try {
            const modulePath = await getModulePath(moduleId);
            return join(kbRoot, modulePath, ...paths);
        } catch (error) {
            // Fallback to direct path if module not found
            console.warn(`Module '${moduleId}' not found, using as direct path`);
            return join(kbRoot, moduleId, ...paths);
        }
    }

    // Direct path provided
    return join(kbRoot, moduleId, ...paths);
}

/**
 * Get all enabled modules
 * @returns {Promise<Array>} List of enabled modules
 */
export async function getEnabledModules() {
    const config = await loadModulesConfig();
    return config.modules.filter(m => m.enabled);
}

/**
 * Check if module is enabled
 * @param {string} moduleId - Module identifier
 * @returns {Promise<boolean>} True if enabled
 */
export async function isModuleEnabled(moduleId) {
    const config = await loadModulesConfig();
    const module = config.modules.find(m => m.moduleId === moduleId);
    return module?.enabled || false;
}

/**
 * Get vector database path for a module
 * @param {string} moduleId - Module identifier (e.g., 'discord', 'documentation', 'context')
 * @returns {Promise<string>} Absolute path to vector database
 */
export async function getVectorDbPath(moduleId) {
    const config = await loadModulesConfig();
    const module = config.modules.find(m => m.moduleId === moduleId && m.enabled);

    if (!module) {
        throw new Error(`Module '${moduleId}' not found or not enabled`);
    }

    if (!module.vectorDb || !module.vectorDb.enabled) {
        throw new Error(`Vector DB not enabled for module '${moduleId}'`);
    }

    const kbRoot = join(__dirname, '../../..');
    return join(kbRoot, module.vectorDb.path, 'vectors.json');
}
