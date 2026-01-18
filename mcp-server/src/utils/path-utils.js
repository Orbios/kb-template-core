import { fileURLToPath } from 'url';
import { dirname, join, resolve, relative } from 'path';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get KB root path from environment variable or fallback to calculated path
// In Docker: /kb (mounted volume)
// Local dev: parent of mcp-server directory
export const KB_ROOT = process.env.KB_ROOT
    ? resolve(process.env.KB_ROOT)
    : resolve(__dirname, '../../..');

/**
 * Resolve a path relative to KB root
 * @param {...string} pathSegments - Path segments to join relative to KB root
 * @returns {string} Absolute path
 */
export function resolveKBPath(...pathSegments) {
    return join(KB_ROOT, ...pathSegments);
}

/**
 * Resolve a Discord context path across all available repositories
 * Checks Public, Core, and Board paths.
 * @param {string} serverId - Discord server ID
 * @param {string} [channelId] - Optional channel ID
 * @param {string} [file] - Optional file name
 * @returns {Promise<string>} Absolute path to the existing file/dir, or default path in Public
 */
export async function resolveDiscordPath(serverId, channelId = null, file = null) {
    const repos = [
        KB_ROOT,                                      // Public (default)
        resolve(KB_ROOT, '../orbios-kb-core'),        // Core (sibling)
        resolve(KB_ROOT, '../orbios-kb-board')        // Board (sibling)
    ];

    const relativePath = ['context', 'discord', serverId];
    if (channelId) relativePath.push(channelId);
    if (file) relativePath.push(file);

    // 1. Return first existing path
    for (const repo of repos) {
        const fullPath = join(repo, ...relativePath);
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }

    // 2. Fallback to legacy path structure (server-ID)
    const legacyPath = ['context', 'discord', `server-${serverId}`];
    if (channelId) legacyPath.push(channelId);
    if (file) legacyPath.push(file);

    for (const repo of repos) {
        const fullPath = join(repo, ...legacyPath);
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }

    // 3. Default to Public repo path (even if not exists)
    return join(KB_ROOT, ...relativePath);
}

/**
 * Validate that a path is within KB root (prevent path traversal)
 * @param {string} path - Path to validate
 * @returns {boolean} True if path is safe
 */
export function isPathSafe(path) {
    const absolutePath = resolve(path);
    const relativePath = relative(KB_ROOT, absolutePath);

    // Path is safe if it doesn't start with .. (outside KB root)
    return !relativePath.startsWith('..') && !resolve(relativePath).startsWith('..');
}

/**
 * Check if a file exists
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Read file content
 * @param {string} path - Path to file
 * @returns {Promise<string>} File content
 */
export async function readKBFile(path) {
    const absolutePath = resolveKBPath(path);

    if (!isPathSafe(absolutePath)) {
        throw new Error(`Path traversal detected: ${path}`);
    }

    if (!await fileExists(absolutePath)) {
        throw new Error(`File not found: ${path}`);
    }

    return await readFile(absolutePath, 'utf-8');
}

/**
 * Write file content
 * @param {string} path - Path to file
 * @param {string} content - Content to write
 */
export async function writeKBFile(path, content) {
    const absolutePath = resolveKBPath(path);

    if (!isPathSafe(absolutePath)) {
        throw new Error(`Path traversal detected: ${path}`);
    }

    // Ensure directory exists
    const dir = dirname(absolutePath);
    await mkdir(dir, { recursive: true });

    await writeFile(absolutePath, content, 'utf-8');
}

/**
 * Create directory if it doesn't exist
 * @param {string} path - Path to directory
 */
export async function ensureDirectory(path) {
    const absolutePath = resolveKBPath(path);

    if (!isPathSafe(absolutePath)) {
        throw new Error(`Path traversal detected: ${path}`);
    }

    await mkdir(absolutePath, { recursive: true });
}
