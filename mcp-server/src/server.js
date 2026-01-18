#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
    missionsCreate,
    missionsRead,
    missionsUpdate,
    missionsList,
    missionsScanContext,
    missionsLinkDiscordChannel,
    missionsImportDiscordContext,
    missionsGenerateDiscordSummary
} from './tools/missions.js';

import {
    userProfileCreate,
    dailyStatusCreate,
    dailyTasksCreate,
    availabilityCreate,
    hrCandidateSave
} from './tools/team.js';

import {
    graphqlIntrospectSchema,
    graphqlQuery
} from './tools/graphql-tools.js';

import { discordTools } from './tools/discord.js';

import { searchTools } from './tools/search.js';

import { getPrompts, getPrompt } from './prompts/index.js';

// Authentication & Authorization
import {
    initializeAuthContext,
    checkToolAuthorization,
    applyDataFilters,
    logAuthEvent,
    AuthorizationError,
    authManager
} from './auth/index.js';


function getOptionalToolDefinition(toolset, key) {
    if (!toolset || !toolset[key]) return null;
    const def = toolset[key];
    if (!def.description || !def.inputSchema) return null;
    return def;
}

function buildOptionalToolEntry(toolset, key) {
    const def = getOptionalToolDefinition(toolset, key);
    if (!def) return null;
    return {
        name: key,
        description: def.description,
        inputSchema: def.inputSchema
    };
}

function getOptionalToolHandler(toolset, key) {
    if (!toolset || !toolset[key] || typeof toolset[key].handler !== 'function') return null;
    return toolset[key].handler;
}

// Create MCP server
const server = new Server(
    {
        name: 'orbios-kb-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            prompts: {},
        },
    }
);

// Tool definitions
const TOOLS = [
    {
        name: 'missions_create',
        description: 'Create a new mission with full directory structure, mission.yaml, description.md, and chat.md',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Mission ID in kebab-case format (e.g., "new-mission-2025")'
                },
                title: {
                    type: 'string',
                    description: 'Mission title'
                },
                status: {
                    type: 'string',
                    enum: ['active', 'completed', 'archived'],
                    description: 'Mission status',
                    default: 'active'
                },
                participants: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of participant user IDs',
                    default: []
                },
                agent: {
                    type: 'object',
                    properties: {
                        model: { type: 'string', description: 'AI model name' },
                        alias: { type: 'string', description: 'AI model alias' }
                    },
                    description: 'Agent configuration (optional)'
                }
            },
            required: ['id', 'title']
        }
    },
    {
        name: 'missions_read',
        description: 'Read mission data aggregated from mission.yaml, description.md, and chat.md',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Mission ID'
                }
            },
            required: ['id']
        }
    },
    {
        name: 'missions_update',
        description: 'Update mission data with validation of status transitions and participants',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Mission ID'
                },
                updates: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['active', 'completed', 'archived']
                        },
                        participants: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        agent: {
                            type: 'object',
                            properties: {
                                model: { type: 'string' },
                                alias: { type: 'string' }
                            }
                        }
                    },
                    description: 'Fields to update'
                }
            },
            required: ['id', 'updates']
        }
    },
    {
        name: 'missions_list',
        description: 'List all missions with optional filtering by status or participant',
        inputSchema: {
            type: 'object',
            properties: {
                filter: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['active', 'completed', 'archived'],
                            description: 'Filter by status'
                        },
                        participant: {
                            type: 'string',
                            description: 'Filter by participant user ID'
                        }
                    }
                }
            }
        }
    },
    {
        name: 'missions_scan_context',
        description: 'Scan all missions and generate context bundles JSON file for AI consumption',
        inputSchema: {
            type: 'object',
            properties: {
                output_path: {
                    type: 'string',
                    description: 'Output path for bundles JSON file',
                    default: '.ai/summaries/missions_bundles.json'
                }
            }
        }
    },
    {
        name: 'missions_link_discord_channel',
        description: 'Link a Discord channel to a mission by storing channel metadata in mission.yaml',
        inputSchema: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Mission ID to link'
                },
                channel_id: {
                    type: 'string',
                    description: 'Discord channel ID'
                },
                channel_name: {
                    type: 'string',
                    description: 'Discord channel name (optional)'
                },
                guild_id: {
                    type: 'string',
                    description: 'Discord guild/server ID (optional)'
                }
            },
            required: ['mission_id', 'channel_id']
        }
    },
    {
        name: 'missions_import_discord_context',
        description: 'Import Discord channel context into mission by creating a context file template',
        inputSchema: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Mission ID to import context into'
                },
                channel_id: {
                    type: 'string',
                    description: 'Discord channel ID (optional if mission already has linked channel)'
                },
                output_path: {
                    type: 'string',
                    description: 'Output path for context file (optional, defaults to mission/discord-context.md)'
                },
                format: {
                    type: 'string',
                    description: 'Output format',
                    default: 'markdown'
                }
            },
            required: ['mission_id']
        }
    },
    {
        name: 'missions_generate_discord_summary',
        description: 'Generate a summary template for Discord channel messages (daily/weekly reports)',
        inputSchema: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Mission ID (if generating summary for a mission-linked channel)'
                },
                channel_id: {
                    type: 'string',
                    description: 'Discord channel ID (required if mission_id not provided)'
                },
                period: {
                    type: 'string',
                    enum: ['daily', 'weekly', 'monthly'],
                    description: 'Summary period',
                    default: 'daily'
                },
                output_path: {
                    type: 'string',
                    description: 'Output path for summary file (optional)'
                },
                format: {
                    type: 'string',
                    description: 'Output format',
                    default: 'markdown'
                }
            }
        }
    },
    // --- Team Tools ---
    {
        name: 'team_user_profile_create',
        description: 'Create a user profile (user.json) with validation',
        inputSchema: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['open', 'core'] },
                accessCore: { type: 'boolean' },
                language: { type: 'string', enum: ['en', 'ru', 'ua', 'uk'] }
            },
            required: ['firstName', 'lastName', 'email', 'role']
        }
    },
    {
        name: 'team_daily_status_create',
        description: 'Create a daily status report with project validation',
        inputSchema: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                date: { type: 'string', description: 'YYYY-MM-DD' },
                content: {
                    type: 'object',
                    properties: {
                        entries: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    project: { type: 'string' },
                                    hours: { type: 'number' },
                                    progress: { type: 'string' }
                                },
                                required: ['project', 'hours', 'progress']
                            }
                        },
                        nextSteps: { type: 'string' }
                    },
                    required: ['entries', 'nextSteps']
                }
            },
            required: ['firstName', 'date', 'content']
        }
    },
    {
        name: 'team_daily_tasks_create',
        description: 'Create a daily tasks file',
        inputSchema: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                date: { type: 'string' },
                tasks: {
                    type: 'object',
                    properties: {
                        willDo: { type: 'array', items: { type: 'object' } },
                        inProgress: { type: 'array', items: { type: 'object' } },
                        finished: { type: 'array', items: { type: 'object' } }
                    }
                }
            },
            required: ['firstName', 'date', 'tasks']
        }
    },
    {
        name: 'team_availability_create',
        description: 'Create weekly availability file',
        inputSchema: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                month: { type: 'string' },
                weekDates: { type: 'string', description: 'DD-DD format' },
                schedule: { type: 'object', additionalProperties: { type: 'string' } }
            },
            required: ['firstName', 'month', 'weekDates', 'schedule']
        }
    },
    {
        name: 'hr_candidate_save',
        description: 'Save evaluated candidate to correct folder',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string', enum: ['low', 'medium', 'top'] },
                role: { type: 'string' },
                lastName: { type: 'string' },
                firstName: { type: 'string' },
                score: { type: 'number' },
                content: { type: 'string', description: 'Full markdown content' }
            },
            required: ['category', 'role', 'lastName', 'firstName', 'score', 'content']
        }
    },
    {
        name: 'graphql_introspect_schema',
        description: 'Introspect GraphQL schema from configured endpoint',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'graphql_query',
        description: 'Execute a GraphQL query against configured endpoint (mutations disabled by default)',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                variables: { type: 'object' }
            },
            required: ['query']
        }
    },
    // --- Discord Tools (Read-Only) ---
    ...[
        buildOptionalToolEntry(discordTools, 'discord_check_updates'),
        buildOptionalToolEntry(discordTools, 'discord_pull_updates'),
        buildOptionalToolEntry(discordTools, 'discord_trigger_sync'),
        buildOptionalToolEntry(discordTools, 'discord_channel_summary'),
        buildOptionalToolEntry(discordTools, 'discord_user_mentions'),
        buildOptionalToolEntry(discordTools, 'discord_search_messages')
    ].filter(Boolean),
    // --- Semantic Search Tools ---
    {
        name: 'discord_semantic_search',
        description: searchTools.discord_semantic_search.description,
        inputSchema: searchTools.discord_semantic_search.inputSchema
    },
    {
        name: 'discord_hybrid_search',
        description: searchTools.discord_hybrid_search.description,
        inputSchema: searchTools.discord_hybrid_search.inputSchema
    },
    {
        name: 'docs_semantic_search',
        description: searchTools.docs_semantic_search.description,
        inputSchema: searchTools.docs_semantic_search.inputSchema
    },
    {
        name: 'docs_hybrid_search',
        description: searchTools.docs_hybrid_search.description,
        inputSchema: searchTools.docs_hybrid_search.inputSchema
    },
    {
        name: 'knowledge_semantic_search',
        description: searchTools.knowledge_semantic_search.description,
        inputSchema: searchTools.knowledge_semantic_search.inputSchema
    },
    {
        name: 'knowledge_hybrid_search',
        description: searchTools.knowledge_hybrid_search.description,
        inputSchema: searchTools.knowledge_hybrid_search.inputSchema
    },
    {
        name: 'unified_semantic_search',
        description: searchTools.unified_semantic_search.description,
        inputSchema: searchTools.unified_semantic_search.inputSchema
    },
    {
        name: 'unified_hybrid_search',
        description: searchTools.unified_hybrid_search.description,
        inputSchema: searchTools.unified_hybrid_search.inputSchema
    }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS
    };
});

// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = getPrompts();
    return {
        prompts: prompts.map(p => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments
        }))
    };
});

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        const promptText = await getPrompt(name, args || {});

        return {
            description: `Prompt: ${name}`,
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: promptText
                    }
                }
            ]
        };
    } catch (error) {
        return {
            description: `Error getting prompt: ${name}`,
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Error: ${error.message}`
                    }
                }
            ]
        };
    }
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        // Initialize authentication context for this request
        await initializeAuthContext(request.meta || {});

        // Normalize tool name: handle gateway format (orbios-kb:missions:list) 
        // and convert to server format (missions__list)
        let normalizedName = name;

        // Remove server prefix if present
        // Handle both formats: "orbios-kb:missions:list" or "orbios-kb__missions__list"
        if (normalizedName.startsWith('orbios-kb:')) {
            // Remove "orbios-kb:" prefix
            normalizedName = normalizedName.replace(/^orbios-kb:/, '');
        } else if (normalizedName.startsWith('orbios-kb__')) {
            // Remove "orbios-kb__" prefix
            normalizedName = normalizedName.replace(/^orbios-kb__/, '');
        }

        // Convert colons to underscores for consistent naming
        normalizedName = normalizedName.replace(/:/g, '_');

        // Authorization check
        try {
            checkToolAuthorization(normalizedName);
            logAuthEvent(normalizedName, true, { args });
        } catch (authError) {
            if (authError instanceof AuthorizationError) {
                logAuthEvent(normalizedName, false, {
                    args,
                    reason: authError.message,
                    details: authError.details
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: {
                                    code: 'AUTHORIZATION_ERROR',
                                    message: authError.message,
                                    details: authError.details
                                }
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
            }
            throw authError;
        }

        // Apply data filters based on user role
        const filteredArgs = applyDataFilters(normalizedName, args);

        let result;

        // Handle both gateway format and internal format
        switch (normalizedName) {
            case 'missions_create':
            case 'missions:create':
            case 'missions__create':
            case 'orbios-kb:missions:create':
                result = await missionsCreate(filteredArgs);
                break;

            case 'missions_read':
            case 'missions:read':
            case 'missions__read':
            case 'orbios-kb:missions:read':
                result = await missionsRead(filteredArgs);
                break;

            case 'missions_update':
            case 'missions:update':
            case 'missions__update':
            case 'orbios-kb:missions:update':
                result = await missionsUpdate(filteredArgs);
                break;

            case 'missions_list':
            case 'missions:list':
            case 'missions__list':
            case 'orbios-kb:missions:list':
                result = await missionsList(filteredArgs);
                break;

            case 'missions_scan_context':
            case 'missions:scan_context':
            case 'missions__scan_context':
            case 'orbios-kb:missions:scan_context':
                result = await missionsScanContext(filteredArgs);
                break;

            case 'missions_link_discord_channel':
            case 'missions:link_discord_channel':
            case 'missions__link_discord_channel':
            case 'orbios-kb:missions:link_discord_channel':
                result = await missionsLinkDiscordChannel(filteredArgs);
                break;

            case 'missions_import_discord_context':
            case 'missions:import_discord_context':
            case 'missions__import_discord_context':
            case 'orbios-kb:missions:import_discord_context':
                result = await missionsImportDiscordContext(filteredArgs);
                break;

            case 'missions_generate_discord_summary':
            case 'missions:generate_discord_summary':
            case 'missions__generate_discord_summary':
            case 'orbios-kb:missions:generate_discord_summary':
                result = await missionsGenerateDiscordSummary(filteredArgs);
                break;

            // --- Team Tools Handlers ---
            case 'team_user_profile_create':
            case 'team:user_profile_create':
            case 'orbios-kb:team:user_profile_create':
                result = await userProfileCreate(args);
                break;

            case 'team_daily_status_create':
            case 'team:daily_status_create':
            case 'orbios-kb:team:daily_status_create':
                result = await dailyStatusCreate(args);
                break;

            case 'team_daily_tasks_create':
            case 'team:daily_tasks_create':
            case 'orbios-kb:team:daily_tasks_create':
                result = await dailyTasksCreate(args);
                break;

            case 'team_availability_create':
            case 'team:availability_create':
            case 'orbios-kb:team:availability_create':
                result = await availabilityCreate(args);
                break;

            case 'hr_candidate_save':
            case 'hr:candidate_save':
            case 'orbios-kb:hr:candidate_save':
                result = await hrCandidateSave(args);
                break;

            case 'graphql_introspect_schema':
            case 'graphql:introspect_schema':
            case 'graphql__introspect_schema':
            case 'orbios-kb:graphql:introspect_schema':
                result = await graphqlIntrospectSchema(args);
                break;

            case 'graphql_query':
            case 'graphql:query':
            case 'graphql__query':
            case 'orbios-kb:graphql:query':
                result = await graphqlQuery(args);
                break;

            // --- Discord Tools (Read-Only) ---
            case 'discord_check_updates':
            case 'discord:check_updates':
            case 'discord__check_updates':
            case 'orbios-kb:discord:check_updates':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_check_updates');
                    if (!handler) throw new Error('Tool not available: discord_check_updates');
                    result = await handler(args);
                }
                break;

            case 'discord_pull_updates':
            case 'discord:pull_updates':
            case 'discord__pull_updates':
            case 'orbios-kb:discord:pull_updates':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_pull_updates');
                    if (!handler) throw new Error('Tool not available: discord_pull_updates');
                    result = await handler(args);
                }
                break;

            case 'discord_trigger_sync':
            case 'discord:trigger_sync':
            case 'discord__trigger_sync':
            case 'orbios-kb:discord:trigger_sync':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_trigger_sync');
                    if (!handler) throw new Error('Tool not available: discord_trigger_sync');
                    result = await handler(args);
                }
                break;

            case 'discord_channel_summary':
            case 'discord:channel_summary':
            case 'discord__channel_summary':
            case 'orbios-kb:discord:channel_summary':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_channel_summary');
                    if (!handler) throw new Error('Tool not available: discord_channel_summary');
                    result = await handler(args);
                }
                break;

            case 'discord_user_mentions':
            case 'discord:user_mentions':
            case 'discord__user_mentions':
            case 'orbios-kb:discord:user_mentions':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_user_mentions');
                    if (!handler) throw new Error('Tool not available: discord_user_mentions');
                    result = await handler(args);
                }
                break;

            case 'discord_search_messages':
            case 'discord:search_messages':
            case 'discord__search_messages':
            case 'orbios-kb:discord:search_messages':
                {
                    const handler = getOptionalToolHandler(discordTools, 'discord_search_messages');
                    if (!handler) throw new Error('Tool not available: discord_search_messages');
                    result = await handler(args);
                }
                break;

            case 'discord_semantic_search':
            case 'discord:semantic_search':
            case 'discord__semantic_search':
            case 'orbios-kb:discord:semantic_search':
                result = await searchTools.discord_semantic_search.handler(args);
                break;

            case 'discord_hybrid_search':
            case 'discord:hybrid_search':
            case 'discord__hybrid_search':
            case 'orbios-kb:discord:hybrid_search':
                result = await searchTools.discord_hybrid_search.handler(args);
                break;

            case 'docs_semantic_search':
            case 'docs:semantic_search':
            case 'docs__semantic_search':
            case 'orbios-kb:docs:semantic_search':
                result = await searchTools.docs_semantic_search.handler(args);
                break;

            case 'docs_hybrid_search':
            case 'docs:hybrid_search':
            case 'docs__hybrid_search':
            case 'orbios-kb:docs:hybrid_search':
                result = await searchTools.docs_hybrid_search.handler(args);
                break;

            case 'knowledge_semantic_search':
            case 'knowledge:semantic_search':
            case 'knowledge__semantic_search':
            case 'orbios-kb:knowledge:semantic_search':
                result = await searchTools.knowledge_semantic_search.handler(args);
                break;

            case 'knowledge_hybrid_search':
            case 'knowledge:hybrid_search':
            case 'knowledge__hybrid_search':
            case 'orbios-kb:knowledge:hybrid_search':
                result = await searchTools.knowledge_hybrid_search.handler(args);
                break;

            case 'unified_semantic_search':
            case 'unified:semantic_search':
            case 'unified__semantic_search':
            case 'orbios-kb:unified:semantic_search':
                result = await searchTools.unified_semantic_search.handler(args);
                break;

            case 'unified_hybrid_search':
            case 'unified:hybrid_search':
            case 'unified__hybrid_search':
            case 'orbios-kb:unified:hybrid_search':
                result = await searchTools.unified_hybrid_search.handler(args);
                break;

            default:
                throw new Error(`Unknown tool: ${name} (normalized: ${normalizedName})`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: {
                            code: error.name || 'ERROR',
                            message: error.message,
                            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                        }
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
});

// Start server
async function main() {
    // Initialize authentication context
    console.error('[Bootstrap] Checking authentication...');
    const authContext = await initializeAuthContext();

    // Log authentication status
    if (authManager.isAuthenticated()) {
        console.error('[Bootstrap] ✅ Authenticated as:', authContext.username);
        console.error('[Bootstrap] Role:', authContext.kbRole);
        const accessLevelDesc = authContext.kbRole === 'admin' ? 'Full access' :
            authContext.kbRole === 'team' ? 'Team access' :
                authContext.kbRole === 'member' ? 'Member access' : 'Public access';
        console.error('[Bootstrap] Access level:', accessLevelDesc);
    } else {
        console.error('[Bootstrap] ⚠️  Running in anonymous mode');
        console.error('[Bootstrap] Role: public (read-only access)');
        console.error('[Bootstrap] Access level: Public access only');
        console.error('[Bootstrap]');
        console.error('[Bootstrap] To enable full features, set ORBIOS_USER_ID in .env');
        console.error('[Bootstrap] See: mcp-server/src/auth/README.md');
    }

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Server is now running on stdio (MCP protocol)
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
