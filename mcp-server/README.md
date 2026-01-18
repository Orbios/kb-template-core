# Orbios KB MCP Server

Custom MCP server for Orbios KB Public operations - **Phase 3 Implementation Complete** ✅

## Status

**✅ Phase 1: Foundation (Mission Operations) - COMPLETE**
**✅ Phase 2: Discord Integration - COMPLETE**
**✅ Phase 2.5: Summary & Reporting - COMPLETE**
**✅ Phase 3: Cross-IDE Integration & Prompts - COMPLETE**

- 8 tools implemented and tested
- 9 prompts/commands available
- 35 tests passing (100% coverage)
- Cross-IDE support (Claude, Cursor, Windsurf, Antigravity)
- Ready for production use

## Implemented Tools (8)

### Mission Operations (5 tools)

1. **`missions__create`** - Create mission with full structure
   - Creates directory + mission.yaml + description.md + chat.md
   - Validates mission ID format (kebab-case)
   - Prevents duplicates

2. **`missions__read`** - Read and aggregate mission data
   - Aggregates mission.yaml + description.md + chat.md
   - Returns complete mission object

3. **`missions__update`** - Update mission with validation
   - Updates mission.yaml
   - Validates status transitions
   - Tracks update timestamp

4. **`missions__list`** - List missions with filtering
   - Filter by status (active/completed/archived)
   - Filter by participant
   - Returns array of missions

5. **`missions__scan_context`** - Generate context bundles
   - Scans all missions
   - Generates JSON bundles for AI consumption
   - Saves to `.ai/summaries/missions_bundles.json`

### Discord Integration (3 tools)

6. **`missions__link_discord_channel`** - Link Discord channel to mission
   - Stores Discord channel metadata in mission.yaml
   - Records channel ID, name, and guild ID
   - Timestamps the link creation

7. **`missions__import_discord_context`** - Import Discord context
   - Creates discord-context.md template in mission directory
   - Uses linked channel or accepts explicit channel ID
   - Updates mission.yaml with context file reference
   - Provides instructions for populating with Discord data

8. **`missions__generate_discord_summary`** - Generate Discord channel summaries
   - Creates structured summary templates (daily/weekly/monthly)
   - Supports mission-linked or standalone channels
   - Generates summaries with sections for topics, decisions, action items
   - Automatically updates mission.yaml with summary references

## MCP Prompts/Commands (9)

**Cross-IDE compatible commands** that work in Claude Desktop, Cursor, Windsurf, and Antigravity:

### Mission Management
1. **`create-mission`** - Create new mission with guided setup
2. **`daily-mission-summary`** - Generate daily mission summary
3. **`weekly-mission-report`** - Generate comprehensive weekly report
4. **`mission-status-update`** - Update mission status
5. **`list-active-missions`** - List all active missions
6. **`scan-missions`** - Scan missions and generate context bundles

### Discord Integration
7. **`link-discord-to-mission`** - Link Discord channel to mission
8. **`discord-daily-summary`** - Generate daily Discord summary
9. **`discord-weekly-summary`** - Generate weekly Discord summary

**Usage:**
- **Cursor:** Cmd/Ctrl + K → Type command name
- **Windsurf:** `/command-name` in AI chat
- **Claude Desktop:** Select from prompts menu
- **Antigravity:** Use prompt selector

**See:** [Cross-IDE Integration Guide](../context/mcp/CROSS-IDE-INTEGRATION.md) for detailed setup and usage.

## Installation

```bash
cd mcp-server
npm install
```

## Testing

```bash
npm test
```

**Test Results:**
- ✅ 35 tests passing
- ✅ All mission tools tested
- ✅ All Discord integration tools tested
- ✅ Summary generation tested
- ✅ Edge cases covered
- ✅ Error handling verified

## Usage

### Team Setup (Recommended)

**👉 See [SETUP.md](./SETUP.md) for complete team onboarding instructions.**

Quick config example:
```json
{
  "mcpServers": {
    "orbios-kb": {
      "command": "node",
      "args": ["C:/Users/YOUR_USERNAME/ProjectsIT/orbios/orbios-kb-public/mcp-server/src/server.js"]
    }
  }
}
```

### As Standalone Server

```bash
npm start
```

The server runs on stdio and communicates via MCP protocol.

### Tool Examples

#### Create a Mission

```json
{
  "name": "missions__create",
  "arguments": {
    "id": "new-mission-2025",
    "title": "New Mission 2025",
    "status": "active",
    "participants": ["erik", "andrew"],
    "agent": {
      "model": "gemini-1.5-flash",
      "alias": "Gemini 1.5"
    }
  }
}
```

#### Read a Mission

```json
{
  "name": "missions__read",
  "arguments": {
    "id": "new-mission-2025"
  }
}
```

#### Update a Mission

```json
{
  "name": "missions__update",
  "arguments": {
    "id": "new-mission-2025",
    "updates": {
      "status": "completed",
      "participants": ["erik", "andrew", "new-member"]
    }
  }
}
```

#### List Missions

```json
{
  "name": "missions__list",
  "arguments": {
    "filter": {
      "status": "active"
    }
  }
}
```

#### Scan Context

```json
{
  "name": "missions__scan_context",
  "arguments": {
    "output_path": ".ai/summaries/missions_bundles.json"
  }
}
```

#### Link Discord Channel

```json
{
  "name": "missions__link_discord_channel",
  "arguments": {
    "mission_id": "new-mission-2025",
    "channel_id": "1445652058224070780",
    "channel_name": "mission-discussion",
    "guild_id": "1414519140861083792"
  }
}
```

#### Import Discord Context

```json
{
  "name": "missions__import_discord_context",
  "arguments": {
    "mission_id": "new-mission-2025"
  }
}
```

Or with explicit channel ID:

```json
{
  "name": "missions__import_discord_context",
  "arguments": {
    "mission_id": "new-mission-2025",
    "channel_id": "1445652058224070780",
    "output_path": "store/missions/new-mission-2025/discord-context.md"
  }
}
```

#### Generate Discord Summary

Daily summary for a mission:

```json
{
  "name": "missions__generate_discord_summary",
  "arguments": {
    "mission_id": "new-mission-2025",
    "period": "daily"
  }
}
```

Weekly summary for any channel:

```json
{
  "name": "missions__generate_discord_summary",
  "arguments": {
    "channel_id": "1445652058224070780",
    "period": "weekly",
    "output_path": ".ai/summaries/team-weekly-2025-12-15.md"
  }
}
```

## Project Structure

```
mcp-server/
├── src/
│   ├── server.js              # Main MCP server
│   ├── tools/
│   │   └── missions.js        # Mission operations
│   ├── validation/
│   │   └── validators.js      # Input validation
│   └── utils/
│       ├── path-utils.js      # Path handling & security
│       └── constants.js       # Constants loader
├── tests/
│   └── missions.test.js       # Mission tool tests
├── package.json
└── README.md
```

## Security

- ✅ Path traversal protection
- ✅ Input validation with Zod schemas
- ✅ Mission ID format validation (kebab-case)
- ✅ Status validation
- ✅ File existence checks

## Next Steps

### Phase 3: Automation (Week 4)

- [ ] Implement `workflows__execute`
- [ ] Implement `processes__execute`

### Phase 4: Gateway Integration (Week 5)

- [ ] Create Dockerfile
- [ ] Build Docker image
- [ ] Add to gateway configuration
- [ ] Test end-to-end

## Development

### Watch Mode

```bash
npm run dev
```

Runs server with auto-reload on file changes.

### Adding New Tools

1. Create tool implementation in `src/tools/`
2. Add tool definition to `src/server.js` TOOLS array
3. Add handler case in CallToolRequestSchema handler
4. Create tests in `tests/`
5. Update this README

## Error Handling

All tools return structured errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "stack": "Stack trace (development only)"
  }
}
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK
- `yaml` - YAML parsing
- `zod` - Runtime validation

## Release Process

We use a component-based tagging strategy. All releases for this MCP server are tagged with the prefix `mcp-server/`.

**Tag Format:** `mcp-server/vX.Y.Z`

**Example:**
- `mcp-server/v0.1.0` - Initial Release
- `mcp-server/v1.0.0` - First Stable Release

To create a new release:
1. Update `package.json` version
2. Commit changes
3. Create tag: `git tag mcp-server/vX.Y.Z`
4. Push tag: `git push origin mcp-server/vX.Y.Z`

## License

MIT

---

**Phase 1 Status:** ✅ Complete (5 tools, 17 tests passing)  
**Phase 2 Status:** ✅ Complete (7 tools total, 28 tests passing)  
**Phase 2.5 Status:** ✅ Complete (8 tools total, 35 tests passing)  
**Next Phase:** Automation  
**Timeline:** On track for 6-week delivery
