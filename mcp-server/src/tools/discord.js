import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { resolveKBPath, fileExists, resolveDiscordPath } from '../utils/path-utils.js';

async function runGit(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('git', args, {
            cwd: resolveKBPath('.'),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `git ${args.join(' ')} failed`));
                return;
            }

            resolve({ stdout, stderr });
        });

        child.on('error', (error) => {
            reject(new Error(`Failed to run git ${args.join(' ')}: ${error.message}`));
        });
    });
}

/**
 * Check for Discord updates and trigger sync on server
 * @param {Object} params - Check parameters
 * @returns {Promise<Object>} Update check result
 */
async function discordCheckUpdates(params = {}) {
    const {
        server_id = process.env.SYNC_SERVER_ID || '1414519140861083792',
        channel_id = null,
        check_remote = true
    } = params;

    // Read local cursor to see last sync
    // Use multi-repo resolver
    const contextPath = await resolveDiscordPath(server_id);

    if (!await fileExists(contextPath)) {
        return {
            has_updates: true,
            message: 'No local data found (checked Public, Core, Board). Pull latest Discord data from the staging branch.',
            recommendation: 'git pull origin staging' // TODO: Might need multi-repo pull recommendation
        };
    }

    const channels = await readdir(contextPath, { withFileTypes: true });
    const channelDirs = channels
        .filter(d => d.isDirectory())
        .filter(d => !channel_id || d.name === channel_id);

    if (channelDirs.length === 0) {
        return {
            has_updates: true,
            message: channel_id
                ? `No local data found for channel ${channel_id}`
                : 'No channels synced locally',
            recommendation: 'git pull origin staging'
        };
    }

    // Check cursor files to see last sync time
    const thresholdMinutes = 15;
    const channelStatuses = [];

    for (const dir of channelDirs) {
        const channelId = dir.name;
        // Resolve cursor path across repos
        const effectiveCursorPath = await resolveDiscordPath(server_id, channelId, 'cursor.json');

        if (await fileExists(effectiveCursorPath)) {
            const { readFile } = await import('fs/promises');
            const cursorContent = await readFile(effectiveCursorPath, 'utf-8');
            const cursor = JSON.parse(cursorContent);

            const lastSyncTime = new Date(cursor.last_synced_at);
            const minutesSinceSync = (Date.now() - lastSyncTime.getTime()) / 1000 / 60;

            channelStatuses.push({
                channel_id: channelId,
                last_synced_at: cursor.last_synced_at,
                minutes_since_sync: Math.round(minutesSinceSync),
                needs_update: minutesSinceSync > thresholdMinutes
            });
        } else {
            channelStatuses.push({
                channel_id: channelId,
                last_synced_at: null,
                minutes_since_sync: null,
                needs_update: true
            });
        }
    }

    const needsUpdate = channelStatuses.some(c => c.needs_update);

    const remoteStatus = {
        checked: false,
        fetched: false,
        remote_ref: 'origin/staging',
        ahead_commits: null,
        behind_commits: null,
        error: null
    };

    if (check_remote) {
        remoteStatus.checked = true;

        try {
            await runGit(['fetch', 'origin', 'staging', '--quiet']);
            remoteStatus.fetched = true;

            const { stdout } = await runGit(['rev-list', '--left-right', '--count', 'HEAD...origin/staging']);
            const parts = stdout.trim().split(/\s+/);
            const ahead = Number(parts[0]);
            const behind = Number(parts[1]);

            remoteStatus.ahead_commits = Number.isFinite(ahead) ? ahead : null;
            remoteStatus.behind_commits = Number.isFinite(behind) ? behind : null;
        } catch (error) {
            remoteStatus.error = error.message;
        }
    }

    const remoteHasNewCommits = (remoteStatus.behind_commits || 0) > 0;

    let message;
    let recommendation;

    if (remoteHasNewCommits) {
        message = 'Remote staging has new commits. Pull latest Discord data from staging.';
        recommendation = 'git pull origin staging';
    } else if (needsUpdate) {
        message = 'Local Discord data is stale (last sync older than the threshold). There may be updates; trigger sync and pull from staging if it produced changes.';
        recommendation = 'discord_trigger_sync';
    } else {
        message = 'Local Discord data is fresh (synced within the threshold)';
        recommendation = null;
    }

    return {
        has_updates: needsUpdate || remoteHasNewCommits,
        server_id,
        channels: channelStatuses,
        local: {
            threshold_minutes: thresholdMinutes,
            is_stale: needsUpdate
        },
        remote: remoteStatus,
        message,
        recommendation
    };
}

/**
 * Pull latest Discord data from Git repository
 * @param {Object} params - Pull parameters
 * @returns {Promise<Object>} Pull result
 */
async function discordPullUpdates(params = {}) {
    const stashMessage = `auto-stash: discord_pull_updates ${new Date().toISOString()}`;

    const result = {
        success: false,
        up_to_date: null,
        output: null,
        message: null,
        timestamp: new Date().toISOString(),
        git: {
            stashed: false,
            stash_message: stashMessage,
            stash_restored: false,
            stash_restore_had_conflicts: false
        }
    };

    // 1) Detect dirty state
    const { stdout: statusStdout } = await runGit(['status', '--porcelain']);
    const isDirty = statusStdout.trim().length > 0;

    // 2) Auto-stash to allow pull to proceed across IDEs
    if (isDirty) {
        const { stdout: stashStdout } = await runGit(['stash', 'push', '-u', '-m', stashMessage]);
        // If there were no changes, git prints "No local changes to save"
        result.git.stashed = !stashStdout.includes('No local changes to save');
    }

    // 3) Pull latest from staging
    try {
        const { stdout: pullStdout } = await runGit(['pull', 'origin', 'staging']);
        result.output = pullStdout;
        result.up_to_date = pullStdout.includes('Already up to date');
        result.success = true;
        result.message = result.up_to_date
            ? 'Already up to date'
            : 'Successfully pulled latest Discord data';
    } catch (error) {
        // Attempt to restore stash even if pull failed
        if (result.git.stashed) {
            try {
                await runGit(['stash', 'pop']);
                result.git.stash_restored = true;
            } catch {
                result.git.stash_restore_had_conflicts = true;
            }
        }

        throw new Error(`Git pull failed: ${error.message}`);
    }

    // 4) Restore stash
    if (result.git.stashed) {
        try {
            await runGit(['stash', 'pop']);
            result.git.stash_restored = true;
        } catch {
            // Keep repository usable; stash remains or conflicts occurred.
            result.git.stash_restore_had_conflicts = true;
            result.message = `${result.message}. Note: stash restoration had conflicts; resolve conflicts manually.`;
        }
    }

    return result;
}

/**
 * Trigger Discord sync on server (on-demand)
 * @param {Object} params - Trigger parameters
 * @returns {Promise<Object>} Trigger result
 */
async function discordTriggerSync(params = {}) {
    const sshHost = process.env.DISCORD_SYNC_SSH_HOST || 'do-sgp1-ops';

    return new Promise((resolve, reject) => {
        const child = spawn('ssh', [sshHost, '/root/sync-discord.sh'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Sync trigger failed: ${stderr}`));
            } else {
                // Parse output for sync stats
                const lines = stdout.split('\n');
                const completedLine = lines.find(l => l.includes('Sync Completed Successfully'));
                const noChangesLine = lines.find(l => l.includes('No changes to commit'));

                resolve({
                    success: true,
                    triggered_at: new Date().toISOString(),
                    had_changes: !noChangesLine,
                    message: completedLine
                        ? 'Sync completed successfully on server'
                        : 'Sync triggered on server',
                    output_preview: lines.slice(-10).join('\n')
                });
            }
        });

        child.on('error', (error) => {
            reject(new Error(`Failed to trigger sync: ${error.message}`));
        });
    });
}

/**
 * Read Discord messages for a channel
 * @param {Object} params - Read parameters
 * @returns {Promise<Object>} Channel messages
 */
async function discordReadMessages(params = {}) {
    const {
        server_id = process.env.SYNC_SERVER_ID || '1414519140861083792',
        channel_id,
        limit = 50,
        days = 7
    } = params;

    if (!channel_id) {
        throw new Error('channel_id is required');
    }

    // Resolve channel path across all repos
    const channelPath = await resolveDiscordPath(server_id, channel_id);

    if (!await fileExists(channelPath)) {
        return {
            channel_id,
            found: false,
            message: `Channel ${channel_id} not found in any synced repository (Public, Core, Board).`
        };
    }

    // Read files in the channel directory
    const files = await readdir(channelPath);
    // Filter for date format YYYY-MM-DD.md
    const dateFiles = files
        .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
        .sort()
        .reverse(); // Newest first

    // Limit to requested days
    const targetFiles = dateFiles.slice(0, days);

    let allContent = '';
    let loadedFiles = [];

    for (const file of targetFiles) {
        const filePath = join(channelPath, file);
        const { readFile } = await import('fs/promises');
        const content = await readFile(filePath, 'utf-8');

        allContent = content + '\n\n' + allContent;
        loadedFiles.push(file);
    }

    return {
        channel_id,
        found: true,
        path: channelPath,
        files_loaded: loadedFiles,
        content: allContent // TODO: In future, parse this into JSON messages if needed
    };
}

// Read-only tools (no DB credentials needed)
export const discordTools = {
    discord_check_updates: {
        description: 'Check if Discord data has updates available (compares local sync time)',
        inputSchema: {
            type: 'object',
            properties: {
                server_id: {
                    type: 'string',
                    description: 'Discord server/guild ID (default: 1414519140861083792)'
                },
                channel_id: {
                    type: 'string',
                    description: 'Specific channel ID to check (optional)'
                },
                check_remote: {
                    type: 'boolean',
                    description: 'If true, fetch origin/staging and compare it to local HEAD to detect remote updates (default: true)'
                }
            }
        },
        handler: discordCheckUpdates
    },
    discord_pull_updates: {
        description: 'Pull latest Discord data from Git repository (git pull origin staging)',
        inputSchema: {
            type: 'object',
            properties: {}
        },
        handler: discordPullUpdates
    },
    discord_trigger_sync: {
        description: 'Trigger Discord sync on server (on-demand) - syncs from Hasura to staging branch',
        inputSchema: {
            type: 'object',
            properties: {}
        },
        handler: discordTriggerSync
    },
    discord_read_messages: {
        description: 'Read raw Discord messages from local cache (supports Public, Core, Board repos)',
        inputSchema: {
            type: 'object',
            properties: {
                server_id: {
                    type: 'string',
                    description: 'Discord server/guild ID (optional)'
                },
                channel_id: {
                    type: 'string',
                    description: 'Channel ID to read'
                },
                days: {
                    type: 'number',
                    description: 'Number of past days to include (default: 7)',
                    default: 7
                }
            },
            required: ['channel_id']
        },
        handler: discordReadMessages
    }
};
