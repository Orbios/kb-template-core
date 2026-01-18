# Authentication & Authorization System

## Overview

The Orbios MCP implements a **3-Layer Security Model** for access control:

1. **Repo Layer (GitHub Teams)** - Controls who can clone/read files
2. **Logic Layer (RBAC)** - Controls who can execute MCP tools
3. **Data Layer (Content Tags)** - Controls what data is returned from queries

This document covers Layer 2 (RBAC) implementation in the MCP server.

## Architecture

### Discord Role → KB Role Mapping

| Discord Role | KB Role | Access Level | Permissions |
|--------------|---------|--------------|-------------|
| Core Lead | `admin` | Private (L4) | Full system access |
| Dev Lead | `team` | Core (L3) | Team tools, mission oversight |
| Dev | `member` | Team (L2) | Assigned missions, public info |
| Open | `public` | Public (L1) | Read-only public content |

### Access Levels Hierarchy

```
PRIVATE (admin only)
  ↓
CORE (admin + team)
  ↓
TEAM (admin + team + member)
  ↓
PUBLIC (everyone)
```

## Implementation

### File Structure

```
mcp-server/src/auth/
├── index.js              # Main exports
├── discord-roles.js      # Role mapping logic
├── permissions.js        # Tool permission matrix
├── auth-manager.js       # Session/context management
├── middleware.js         # Authorization checks
└── hasura-auth.js        # Hasura integration
```

### Key Components

#### 1. Discord Role Mapping (`discord-roles.js`)

Maps Discord role IDs to KB roles:

```javascript
import { mapDiscordRoleToKBRole } from './auth/index.js';

const kbRole = mapDiscordRoleToKBRole(['1446244355479306260']); // → 'admin'
```

#### 2. Permission Matrix (`permissions.js`)

Defines which roles can use which tools:

```javascript
import { canUseTool } from './auth/index.js';

canUseTool('missions_create', 'admin');  // → true
canUseTool('missions_create', 'public'); // → false
```

#### 3. Auth Manager (`auth-manager.js`)

Manages authentication context:

```javascript
import { authManager } from './auth/index.js';

const context = authManager.getContext();
console.log(context.kbRole); // → 'team'
```

#### 4. Middleware (`middleware.js`)

Enforces authorization on tool calls:

```javascript
import { checkToolAuthorization } from './auth/index.js';

// Throws AuthorizationError if user lacks permission
checkToolAuthorization('graphql_query');
```

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

```env
# User authentication (development)
ORBIOS_USER_ID=your_discord_user_id
ORBIOS_USER_ROLES=role_id_1,role_id_2

# Hasura connection (production)
HASURA_HOST=your_server_ip
HASURA_PASSWORD=your_password
```

### Development Setup

For local development, set your Discord user ID and roles:

```env
ORBIOS_USER_ID=123456789012345678
ORBIOS_USER_ROLES=1446244355479306260  # Core Lead role
```

### Production Setup

In production, the system will:
1. Connect to Hasura on `do-sgp1-ops`
2. Fetch user data from the database
3. Validate Discord guild membership
4. Map roles automatically

## Usage

### Testing Authorization

```bash
# Set yourself as admin
export ORBIOS_USER_ID=your_id
export ORBIOS_USER_ROLES=1446244355479306260

# Start MCP server
npm start

# Try a restricted tool (should work)
# missions_create

# Set yourself as public
export ORBIOS_USER_ROLES=1446245138612891658

# Try a restricted tool (should fail)
# missions_create → AUTHORIZATION_ERROR
```

### Checking Current Role

The auth system logs all authorization events to stderr:

```json
{
  "timestamp": "2025-12-22T22:00:00.000Z",
  "toolName": "missions_create",
  "allowed": false,
  "userId": "123456789",
  "kbRole": "public",
  "authenticated": true
}
```

## Tool Permissions Matrix

### Mission Tools

| Tool | Admin | Team | Member | Public |
|------|-------|------|--------|--------|
| `missions_create` | ✅ | ✅ | ❌ | ❌ |
| `missions_read` | ✅ All | ✅ Team | ✅ Assigned | ❌ |
| `missions_update` | ✅ | ✅ | ❌ | ❌ |
| `missions_list` | ✅ All | ✅ Team | ✅ Assigned | ✅ Public |

### Team Tools

| Tool | Admin | Team | Member | Public |
|------|-------|------|--------|--------|
| `team_user_profile_create` | ✅ | ❌ | ❌ | ❌ |
| `team_daily_status_create` | ✅ | ✅ | ✅ | ❌ |
| `team_daily_tasks_create` | ✅ | ✅ | ✅ | ❌ |

### GraphQL Tools

| Tool | Admin | Team | Member | Public |
|------|-------|------|--------|--------|
| `graphql_introspect_schema` | ✅ | ❌ | ❌ | ❌ |
| `graphql_query` | ✅ | ❌ | ❌ | ❌ |

### Search Tools

All search tools apply data filtering based on role:
- **Admin**: Sees all data
- **Team**: Sees public + team + core data
- **Member**: Sees public + team data (assigned to them)
- **Public**: Sees only public data

## Data Filtering

When a tool supports data filtering, the system automatically adds `_accessFilter` to the arguments:

```javascript
// User with 'member' role calls missions_list
// Original args: {}
// Filtered args: {
//   _accessFilter: {
//     levels: ['public', 'team'],
//     assignedTo: 'user_id_123'
//   }
// }
```

Tool implementations should respect this filter when querying data.

## Error Handling

### Authorization Errors

When a user lacks permission:

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Access denied: Role 'public' cannot use tool 'missions_create'",
    "details": {
      "toolName": "missions_create",
      "userRole": "public",
      "userId": "123456789",
      "authenticated": true
    }
  }
}
```

## Security Considerations

### Current Implementation (Development)

- ✅ Role-based access control
- ✅ Tool permission enforcement
- ✅ Audit logging
- ⚠️ Environment-based auth (not production-ready)

### Production Requirements

- [ ] Discord OAuth integration
- [ ] JWT token validation
- [ ] Session management (Redis)
- [ ] Rate limiting
- [ ] Encrypted connections to Hasura
- [ ] Audit log persistence

## Next Steps

### Phase 1: Current (Development)
- ✅ RBAC implementation
- ✅ Permission matrix
- ✅ Environment-based auth

### Phase 2: Hasura Integration
- [ ] Connect to production Hasura
- [ ] Fetch user data from database
- [ ] Validate guild membership

### Phase 3: OAuth (Future)
- [ ] Discord OAuth application
- [ ] Web-based login flow
- [ ] JWT token generation
- [ ] Session persistence

## References

- [Architecture Design](../../docs/architecture/auth-system.md)
- [Solutions Research](../../docs/architecture/auth-solutions-research.md)
- [Implementation Plan](../../docs/architecture/kb-restructure-implementation-plan.md)

## Discord Role IDs (Reference)

```javascript
CORE_LEAD: '1446244355479306260'
DEV_LEAD:  '1446245005663535298'
DEV:       '1446245072290058260'
OPEN:      '1446245138612891658'
```
