// MCP Prompts for Orbios KB
// These prompts provide quick access to common workflows and operations

import { resolveKBPath, fileExists, readKBFile } from '../utils/path-utils.js';

/**
 * Get all available prompts
 * @returns {Array} List of prompt definitions
 */
export function getPrompts() {
    return [
        // Mission Management Prompts
        {
            name: 'create-mission',
            description: 'Create a new mission with guided setup',
            arguments: [
                {
                    name: 'mission_id',
                    description: 'Mission ID (kebab-case)',
                    required: true
                },
                {
                    name: 'title',
                    description: 'Mission title',
                    required: true
                }
            ]
        },
        {
            name: 'daily-mission-summary',
            description: 'Generate daily summary for a mission',
            arguments: [
                {
                    name: 'mission_id',
                    description: 'Mission ID to summarize',
                    required: true
                }
            ]
        },
        {
            name: 'weekly-mission-report',
            description: 'Generate weekly report for a mission',
            arguments: [
                {
                    name: 'mission_id',
                    description: 'Mission ID to report on',
                    required: true
                }
            ]
        },
        {
            name: 'link-discord-to-mission',
            description: 'Link a Discord channel to a mission',
            arguments: [
                {
                    name: 'mission_id',
                    description: 'Mission ID',
                    required: true
                },
                {
                    name: 'channel_id',
                    description: 'Discord channel ID',
                    required: true
                }
            ]
        },

        // Discord Summary Prompts
        {
            name: 'discord-daily-summary',
            description: 'Generate daily summary from Discord channel',
            arguments: [
                {
                    name: 'channel_id',
                    description: 'Discord channel ID',
                    required: false
                },
                {
                    name: 'mission_id',
                    description: 'Mission ID (if channel is linked)',
                    required: false
                }
            ]
        },
        {
            name: 'discord-weekly-summary',
            description: 'Generate weekly summary from Discord channel',
            arguments: [
                {
                    name: 'channel_id',
                    description: 'Discord channel ID',
                    required: false
                },
                {
                    name: 'mission_id',
                    description: 'Mission ID (if channel is linked)',
                    required: false
                }
            ]
        },

        // Workflow Prompts
        {
            name: 'scan-missions',
            description: 'Scan all missions and generate context bundles',
            arguments: []
        },
        {
            name: 'list-active-missions',
            description: 'List all active missions',
            arguments: []
        },
        {
            name: 'mission-status-update',
            description: 'Update mission status',
            arguments: [
                {
                    name: 'mission_id',
                    description: 'Mission ID',
                    required: true
                },
                {
                    name: 'status',
                    description: 'New status (active/completed/archived)',
                    required: true
                }
            ]
        }
    ];
}

/**
 * Get prompt template by name
 * @param {string} name - Prompt name
 * @param {Object} args - Prompt arguments
 * @returns {Promise<string>} Formatted prompt
 */
export async function getPrompt(name, args = {}) {
    const prompts = {
        'create-mission': async (args) => {
            return `Create a new mission with the following details:

**Mission ID:** ${args.mission_id}
**Title:** ${args.title}

Please:
1. Create the mission using missions__create
2. Set up the mission structure (mission.yaml, description.md, chat.md)
3. Confirm the mission was created successfully
4. Show me the mission details

Use the missions__create tool with these parameters.`;
        },

        'daily-mission-summary': async (args) => {
            return `Generate a daily summary for mission: ${args.mission_id}

Please:
1. Check if the mission has a linked Discord channel
2. If yes, generate a Discord summary using missions__generate_discord_summary
3. If no, create a manual summary template
4. Include:
   - Key activities today
   - Decisions made
   - Action items
   - Blockers or issues
   - Next steps

Period: daily`;
        },

        'weekly-mission-report': async (args) => {
            return `Generate a weekly report for mission: ${args.mission_id}

Please:
1. Read the mission data using missions__read
2. Generate a weekly Discord summary if channel is linked
3. Create a comprehensive report including:
   - Week overview
   - Progress on objectives
   - Key decisions and outcomes
   - Team contributions
   - Upcoming priorities
   - Risks and mitigation

Period: weekly`;
        },

        'link-discord-to-mission': async (args) => {
            return `Link Discord channel to mission:

**Mission:** ${args.mission_id}
**Channel ID:** ${args.channel_id}

Please:
1. Link the channel using missions__link_discord_channel
2. Import the Discord context using missions__import_discord_context
3. Confirm the link was successful
4. Show me the updated mission details`;
        },

        'discord-daily-summary': async (args) => {
            const target = args.mission_id ? `mission: ${args.mission_id}` : `channel: ${args.channel_id}`;
            return `Generate a daily Discord summary for ${target}

Please:
1. Use missions__generate_discord_summary with period: daily
2. Export recent Discord messages (last 24 hours)
3. Analyze the messages and populate the summary with:
   - Key discussion topics
   - Important decisions
   - Action items identified
   - Active participants
   - Resources shared
4. Save the summary`;
        },

        'discord-weekly-summary': async (args) => {
            const target = args.mission_id ? `mission: ${args.mission_id}` : `channel: ${args.channel_id}`;
            return `Generate a weekly Discord summary for ${target}

Please:
1. Use missions__generate_discord_summary with period: weekly
2. Export Discord messages from the past week
3. Create a comprehensive summary including:
   - Major discussion themes
   - Key decisions and outcomes
   - Action items and assignments
   - Participant engagement
   - Important links and resources
   - Week highlights
4. Save the summary`;
        },

        'scan-missions': async (args) => {
            return `Scan all missions and generate context bundles

Please:
1. Use missions__scan_context to scan all missions
2. Generate the context bundles JSON file
3. Show me a summary of:
   - Total missions scanned
   - Active missions count
   - Completed missions count
   - Output file location`;
        },

        'list-active-missions': async (args) => {
            return `List all active missions

Please:
1. Use missions__list with filter: { status: 'active' }
2. Display the missions in a formatted table showing:
   - Mission ID
   - Title
   - Participants
   - Created date
3. Provide a count of active missions`;
        },

        'mission-status-update': async (args) => {
            return `Update mission status:

**Mission:** ${args.mission_id}
**New Status:** ${args.status}

Please:
1. Read the current mission data
2. Update the status using missions__update
3. Confirm the update was successful
4. Show me the updated mission details`;
        }
    };

    const promptFn = prompts[name];
    if (!promptFn) {
        throw new Error(`Unknown prompt: ${name}`);
    }

    return await promptFn(args);
}
