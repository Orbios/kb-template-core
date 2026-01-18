import YAML from 'yaml';
import { readdir } from 'fs/promises';
import {
    resolveKBPath,
    fileExists,
    readKBFile,
    writeKBFile,
    ensureDirectory
} from '../utils/path-utils.js';
import { resolveKBPath as resolveModulePath } from '../utils/modules-config.js';
import {
    validateMissionCreate,
    validateMissionUpdate,
    missionListFilterSchema
} from '../validation/validators.js';

/**
 * Resolve missions path using modules config
 */
async function resolveMissionsPath(...paths) {
    return await resolveModulePath('missions', ...paths);
}

/**
 * Create a new mission
 * @param {Object} params - Mission parameters
 * @returns {Promise<Object>} Result with success status and created files
 */
// Helper to find mission ID in standard locations
async function findMissionPath(id) {
    const categories = ['', 'active', 'completed', 'archived', 'planned', 'draft'];

    for (const cat of categories) {
        const path = cat
            ? `missions/${cat}/${id}/mission.yaml`
            : `missions/${id}/mission.yaml`;

        if (await fileExists(resolveKBPath(path))) {
            return path.replace('/mission.yaml', '');
        }
    }
    return null;
}

export async function missionsCreate(params) {
    // Validate input
    const validated = validateMissionCreate(params);
    const { id, title, status, participants, agent } = validated;

    // Check if mission already exists
    const existingPath = await findMissionPath(id);
    if (existingPath) {
        throw new Error(`Mission "${id}" already exists`);
    }

    // Determine target category
    // Default to 'active' unless status maps directly to a folder
    const targetCategory = ['completed', 'archived'].includes(status) ? status : 'active';
    const missionPath = `missions/${targetCategory}/${id}`;
    const missionYamlPath = `${missionPath}/mission.yaml`;

    // Create mission directory
    await ensureDirectory(missionPath);

    // Create mission.yaml
    const missionData = {
        id,
        title,
        status,
        participants,
        ...(agent && { agent }),
        created_at: new Date().toISOString()
    };

    const missionYaml = YAML.stringify(missionData);
    await writeKBFile(missionYamlPath, missionYaml);

    // Create description.md template
    const descriptionTemplate = `# ${title}

## Overview

[Describe the mission purpose and goals]

## Objectives

- [ ] Objective 1
- [ ] Objective 2

## Status

Current status: ${status}

## Participants

${participants.length > 0 ? participants.map(p => `- ${p}`).join('\n') : '- None yet'}

## Notes

[Add mission notes here]
`;

    await writeKBFile(`${missionPath}/description.md`, descriptionTemplate);

    // Create empty chat.md
    const chatTemplate = `# ${title} - Chat Log

## ${new Date().toISOString().split('T')[0]}

[Mission chat log will be recorded here]
`;

    await writeKBFile(`${missionPath}/chat.md`, chatTemplate);

    return {
        success: true,
        path: missionPath,
        files_created: ['mission.yaml', 'description.md', 'chat.md']
    };
}

/**
 * Read mission data
 * @param {Object} params - Parameters with mission ID
 * @returns {Promise<Object>} Mission data aggregated from multiple files
 */
export async function missionsRead(params) {
    const { id } = params;

    if (!id) {
        throw new Error('Mission ID is required');
    }

    const foundPath = await findMissionPath(id);
    if (!foundPath) {
        throw new Error(`Mission "${id}" not found`);
    }

    const missionPath = foundPath;
    const missionYamlPath = `${missionPath}/mission.yaml`;

    // Read mission.yaml
    const missionYaml = await readKBFile(missionYamlPath);
    const missionData = YAML.parse(missionYaml);

    // Read description.md if exists
    let description = null;
    const descriptionPath = `${missionPath}/description.md`;
    if (await fileExists(resolveKBPath(descriptionPath))) {
        description = await readKBFile(descriptionPath);
    }

    // Read chat.md if exists
    let chat = null;
    const chatPath = `${missionPath}/chat.md`;
    if (await fileExists(resolveKBPath(chatPath))) {
        chat = await readKBFile(chatPath);
    }

    return {
        ...missionData,
        files: {
            mission: missionYamlPath,
            description: descriptionPath,
            chat: chatPath
        },
        content: {
            description,
            chat
        }
    };
}

/**
 * Update mission data
 * @param {Object} params - Parameters with mission ID and updates
 * @returns {Promise<Object>} Result with success status
 */
export async function missionsUpdate(params) {
    // Validate input
    const validated = validateMissionUpdate(params);
    const { id, updates } = validated;

    const foundPath = await findMissionPath(id);
    if (!foundPath) {
        throw new Error(`Mission "${id}" not found`);
    }

    const missionPath = foundPath;
    const missionYamlPath = `${missionPath}/mission.yaml`;

    // Read current mission data
    const missionYaml = await readKBFile(missionYamlPath);
    const missionData = YAML.parse(missionYaml);

    // Apply updates
    const updatedData = {
        ...missionData,
        ...updates,
        updated_at: new Date().toISOString()
    };

    // Write updated mission.yaml
    const updatedYaml = YAML.stringify(updatedData);
    await writeKBFile(missionYamlPath, updatedYaml);

    return {
        success: true,
        path: missionYamlPath,
        updated_fields: Object.keys(updates)
    };
}

/**
 * List missions with optional filtering
 * @param {Object} params - Filter parameters
 * @returns {Promise<Array>} List of missions
 */
export async function missionsList(params = {}) {
    // Validate filter
    const filter = missionListFilterSchema.parse(params.filter);

    const missionsDir = resolveKBPath('missions');

    // Check if missions directory exists
    if (!await fileExists(missionsDir)) {
        return [];
    }

    // Read top-level directories
    const entries = await readdir(missionsDir, { withFileTypes: true });
    const topLevelDirs = entries.filter(entry => entry.isDirectory());

    // Collect all potential mission paths
    const missionFiles = [];
    const categories = ['active', 'completed', 'archived', 'planned', 'draft'];

    for (const dir of topLevelDirs) {
        if (categories.includes(dir.name)) {
            // It is a category folder, scan inside for missions
            const catPathStr = `missions/${dir.name}`;
            try {
                const catPath = resolveKBPath(catPathStr);
                const catEntries = await readdir(catPath, { withFileTypes: true });
                const catMissionDirs = catEntries.filter(e => e.isDirectory());

                for (const subDir of catMissionDirs) {
                    missionFiles.push({
                        id: subDir.name,
                        path: `missions/${dir.name}/${subDir.name}/mission.yaml`
                    });
                }
            } catch (err) {
                console.warn(`Failed to read category dir ${dir.name}:`, err.message);
            }
        } else {
            // It is likely a mission folder (legacy/flat structure)
            missionFiles.push({
                id: dir.name,
                path: `missions/${dir.name}/mission.yaml`
            });
        }
    }

    // Read all mission.yaml files
    const missions = [];

    for (const m of missionFiles) {
        try {
            const missionYaml = await readKBFile(m.path);
            const missionData = YAML.parse(missionYaml);

            // Apply filters
            if (filter) {
                if (filter.status && missionData.status !== filter.status) {
                    continue;
                }

                if (filter.participant) {
                    if (!missionData.participants ||
                        !missionData.participants.includes(filter.participant)) {
                        continue;
                    }
                }
            }

            missions.push(missionData);
        } catch (error) {
            // Silent fail for non-mission folders that might be mistaken (e.g. if they don't have mission.yaml)
            // console.warn(`Failed to read mission ${m.id}:`, error.message);
        }
    }

    return missions;
}

/**
 * Scan missions and generate context bundles
 * @param {Object} params - Parameters with output path
 * @returns {Promise<Object>} Result with bundle information
 */
export async function missionsScanContext(params = {}) {
    const outputPath = params.output_path || '.ai/summaries/missions_bundles.json';

    // Get all missions
    const missions = await missionsList();

    // Generate context bundles
    const bundles = [];

    for (const mission of missions) {
        try {
            // Read full mission data
            const fullMission = await missionsRead({ id: mission.id });

            // Create context bundle
            const bundle = {
                id: mission.id,
                title: mission.title,
                status: mission.status,
                participants: mission.participants || [],
                created_at: mission.created_at,
                updated_at: mission.updated_at,
                description_preview: fullMission.content.description
                    ? fullMission.content.description.substring(0, 500) + '...'
                    : null,
                has_chat: !!fullMission.content.chat,
                files: fullMission.files
            };

            bundles.push(bundle);
        } catch (error) {
            console.warn(`Failed to create bundle for mission ${mission.id}:`, error.message);
        }
    }

    // Write bundles to output file
    const bundlesJson = JSON.stringify({
        generated_at: new Date().toISOString(),
        total_missions: bundles.length,
        bundles
    }, null, 2);

    await writeKBFile(outputPath, bundlesJson);

    return {
        success: true,
        output_path: outputPath,
        total_missions: bundles.length,
        bundles_preview: bundles.slice(0, 5) // Return first 5 for preview
    };
}

/**
 * Link Discord channel to mission
 * @param {Object} params - Parameters with mission ID and Discord channel info
 * @returns {Promise<Object>} Result with success status
 */
export async function missionsLinkDiscordChannel(params) {
    const { mission_id, channel_id, channel_name, guild_id } = params;

    if (!mission_id) {
        throw new Error('Mission ID is required');
    }

    if (!channel_id) {
        throw new Error('Discord channel ID is required');
    }

    const foundPath = await findMissionPath(mission_id);
    if (!foundPath) {
        throw new Error(`Mission "${mission_id}" not found`);
    }

    const missionPath = foundPath;
    const missionYamlPath = `${missionPath}/mission.yaml`;

    // Read current mission data
    const missionYaml = await readKBFile(missionYamlPath);
    const missionData = YAML.parse(missionYaml);

    // Add Discord link to mission data
    const updatedData = {
        ...missionData,
        discord: {
            channel_id,
            ...(channel_name && { channel_name }),
            ...(guild_id && { guild_id }),
            linked_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
    };

    // Write updated mission.yaml
    const updatedYaml = YAML.stringify(updatedData);
    await writeKBFile(missionYamlPath, updatedYaml);

    return {
        success: true,
        mission_id,
        linked_channel: updatedData.discord
    };
}

/**
 * Import Discord channel context into mission
 * @param {Object} params - Parameters with mission ID and optional channel ID
 * @returns {Promise<Object>} Result with import information
 */
export async function missionsImportDiscordContext(params) {
    const { mission_id, channel_id, output_path, format = 'markdown' } = params;

    if (!mission_id) {
        throw new Error('Mission ID is required');
    }

    const foundPath = await findMissionPath(mission_id);
    if (!foundPath) {
        throw new Error(`Mission "${mission_id}" not found`);
    }

    const missionPath = foundPath;
    const missionYamlPath = `${missionPath}/mission.yaml`;

    // Read current mission data
    const missionYaml = await readKBFile(missionYamlPath);
    const missionData = YAML.parse(missionYaml);

    // Determine which channel to import from
    let targetChannelId = channel_id;

    if (!targetChannelId) {
        // Try to get channel ID from mission's Discord link
        if (missionData.discord && missionData.discord.channel_id) {
            targetChannelId = missionData.discord.channel_id;
        } else {
            throw new Error('No Discord channel linked to this mission. Please provide channel_id or link a channel first.');
        }
    }

    // Determine output path
    const contextOutputPath = output_path || `${missionPath}/discord-context.md`;

    // Note: In a real implementation, this would call the Discord MCP's export_channel tool
    // For now, we'll create a placeholder that documents the structure
    // The AI agent will need to call discord__export_channel separately and pass the data

    // Create markdown template for Discord context
    const contextTemplate = `# Discord Context - ${missionData.title}

**Channel ID:** ${targetChannelId}
**Imported At:** ${new Date().toISOString()}

---

## Instructions

To populate this file with actual Discord messages:

1. Use the Discord MCP to export channel messages:
   \`\`\`
   discord__export_channel({
     channel_id: "${targetChannelId}",
     format: "markdown"
   })
   \`\`\`

2. Copy the exported content here

---

## Messages

[Discord messages will appear here after export]

`;

    // Write context file
    await writeKBFile(contextOutputPath, contextTemplate);

    // Update mission.yaml with context file reference
    const updatedData = {
        ...missionData,
        discord: {
            ...(missionData.discord || {}),
            channel_id: targetChannelId,
            context_file: contextOutputPath,
            last_import: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
    };

    const updatedYaml = YAML.stringify(updatedData);
    await writeKBFile(missionYamlPath, updatedYaml);

    return {
        success: true,
        mission_id,
        channel_id: targetChannelId,
        output_path: contextOutputPath,
        note: 'Context file created. Use Discord MCP to export actual messages and update this file.'
    };
}

/**
 * Generate Discord channel summary
 * @param {Object} params - Parameters with mission ID or channel ID
 * @returns {Promise<Object>} Result with summary information
 */
export async function missionsGenerateDiscordSummary(params) {
    const { mission_id, channel_id, period = 'daily', output_path, format = 'markdown' } = params;

    if (!mission_id && !channel_id) {
        throw new Error('Either mission_id or channel_id is required');
    }

    let targetMissionId = mission_id;
    let targetChannelId = channel_id;
    let contextFilePath = null;
    let resolvedMissionPath = null;

    // If mission_id provided, get channel info from mission
    if (mission_id) {
        const foundPath = await findMissionPath(mission_id);
        if (!foundPath) {
            throw new Error(`Mission "${mission_id}" not found`);
        }

        resolvedMissionPath = foundPath;
        const missionYamlPath = `${resolvedMissionPath}/mission.yaml`;

        const missionYaml = await readKBFile(missionYamlPath);
        const missionData = YAML.parse(missionYaml);

        if (!missionData.discord || !missionData.discord.channel_id) {
            throw new Error(`Mission "${mission_id}" has no linked Discord channel`);
        }

        targetChannelId = missionData.discord.channel_id;
        contextFilePath = missionData.discord.context_file || `${resolvedMissionPath}/discord-context.md`;
    }

    // Determine output path
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultOutputPath = mission_id && resolvedMissionPath
        ? `${resolvedMissionPath}/summaries/discord-summary-${timestamp}.md`
        : `.ai/summaries/discord-summary-${targetChannelId}-${timestamp}.md`;

    const summaryOutputPath = output_path || defaultOutputPath;

    // Ensure summaries directory exists
    const summaryDir = summaryOutputPath.substring(0, summaryOutputPath.lastIndexOf('/'));
    await ensureDirectory(summaryDir);

    // Create summary template
    const summaryTemplate = `# Discord Channel Summary

**Channel ID:** ${targetChannelId}
**Mission:** ${mission_id || 'N/A'}
**Period:** ${period}
**Generated:** ${new Date().toISOString()}

---

## Summary

This is a template for Discord channel summary. To generate an actual summary:

1. **Export Discord messages** using Discord MCP:
   \`\`\`
   discord__export_channel({
     channel_id: "${targetChannelId}",
     format: "markdown"
   })
   \`\`\`

2. **Analyze the messages** to extract:
   - Key discussion topics
   - Important decisions made
   - Action items identified
   - Participants and their contributions
   - Links and resources shared

3. **Update this file** with the summary

---

## Key Topics

[List main discussion topics here]

---

## Decisions Made

[List important decisions here]

---

## Action Items

- [ ] Action item 1
- [ ] Action item 2

---

## Participants

[List active participants]

---

## Resources Shared

[List important links, files, or resources]

---

## Next Steps

[Outline next steps or follow-up actions]

---

**Note:** This is a template. Use an AI agent to analyze Discord messages and populate this summary.
`;

    // Write summary file
    await writeKBFile(summaryOutputPath, summaryTemplate);

    // If mission_id provided, update mission.yaml with summary reference
    if (mission_id && resolvedMissionPath) {
        const missionYamlPath = `${resolvedMissionPath}/mission.yaml`;
        const missionYaml = await readKBFile(missionYamlPath);
        const missionData = YAML.parse(missionYaml);

        const updatedData = {
            ...missionData,
            discord: {
                ...(missionData.discord || {}),
                summaries: [
                    ...(missionData.discord?.summaries || []),
                    {
                        file: summaryOutputPath,
                        period,
                        generated_at: new Date().toISOString()
                    }
                ]
            },
            updated_at: new Date().toISOString()
        };

        const updatedYaml = YAML.stringify(updatedData);
        await writeKBFile(missionYamlPath, updatedYaml);
    }

    return {
        success: true,
        mission_id: mission_id || null,
        channel_id: targetChannelId,
        output_path: summaryOutputPath,
        period,
        note: 'Summary template created. Use Discord MCP to export messages and AI agent to generate actual summary.'
    };
}

