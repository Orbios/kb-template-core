# Hasura Integration Setup Guide

## Overview

This guide walks through connecting the MCP auth system to the production Hasura database on `do-sgp1-ops`.

## Prerequisites

- SSH access to `do-sgp1-ops`
- Hasura database credentials
- PostgreSQL client (for testing)

## Step 1: Get Database Credentials

### Option A: From Server

SSH into the server and check the Hasura configuration:

```bash
ssh do-sgp1-ops

# Check Hasura environment
cd /path/to/hasura
cat .env | grep -E "POSTGRES|DATABASE"

# Or check Docker compose
docker-compose ps
docker-compose logs hasura | grep -i postgres
```

### Option B: From Documentation

Check your internal docs for:
- Database host (likely `localhost` or `127.0.0.1` from server perspective)
- Database port (default: `5432`)
- Database name (likely `postgres` or `hasura`)
- Username (likely `postgres`)
- Password

## Step 2: Test Connection Locally

### Via SSH Tunnel

Create an SSH tunnel to access the database from your local machine:

```bash
# Forward local port 5433 to remote port 5432
ssh -L 5433:localhost:5432 do-sgp1-ops

# Keep this terminal open
```

In a new terminal, test the connection:

```bash
# Set environment variables
export HASURA_HOST=localhost
export HASURA_PORT=5433
export HASURA_DATABASE=postgres
export HASURA_USER=postgres
export HASURA_PASSWORD=your_password

# Run schema inspector
cd mcp-server
node scripts/inspect-hasura-schema.js
```

### Expected Output

```
🔍 Connecting to Hasura database...
✅ Connected!

📊 Tables in database:
======================

📋 Table: discord_messages
──────────────────────────────────────────────────
  • message_id                   bigint               NOT NULL
  • server_id                    text                 NOT NULL
  • channel_id                   text                 NOT NULL
  • user_id                      text                 NOT NULL
  • username                     text                 NOT NULL
  • content                      text                 NULL
  • created_at                   timestamp            NOT NULL
  
  Rows: 15234
```

## Step 3: Understand the Schema

The inspector will show you what tables exist. Common scenarios:

### Scenario A: Discord Tables Exist

If you see tables like:
- `discord_messages`
- `discord_users`
- `guild_members`

Great! The auth system can use these directly.

### Scenario B: Need to Create Auth Tables

If user/role tables don't exist, you'll need to create them:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    discriminator TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create guild members table
CREATE TABLE IF NOT EXISTS guild_members (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, guild_id)
);

-- Create user roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, guild_id, role_id)
);

-- Create indexes
CREATE INDEX idx_guild_members_user ON guild_members(user_id);
CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_guild ON user_roles(guild_id);
```

### Scenario C: Different Schema

If tables exist but have different names/structure, update `hasura-auth.js` queries to match.

## Step 4: Update Auth Configuration

Based on what you found, update the queries in `src/auth/hasura-auth.js`:

```javascript
// Example: If your table is called 'discord_users' instead of 'users'
const query = `
    SELECT 
        u.user_id,
        u.username,
        u.discriminator,
        COALESCE(
            json_agg(DISTINCT r.role_id) 
            FILTER (WHERE r.role_id IS NOT NULL),
            '[]'::json
        ) as roles
    FROM discord_users u  -- Changed from 'users'
    LEFT JOIN discord_user_roles r ON u.user_id = r.user_id
    WHERE u.user_id = $1
    GROUP BY u.user_id, u.username, u.discriminator
`;
```

## Step 5: Enable Hasura Auth in MCP

Update `src/auth/auth-manager.js` to use Hasura instead of env vars:

```javascript
import { authenticateViaHasura } from './hasura-auth.js';

export async function initializeAuthContext(metadata = {}) {
    const userId = process.env.ORBIOS_USER_ID;
    
    if (!userId) {
        // No user ID - anonymous
        const context = authManager.getAnonymousContext();
        authManager.setContext(context);
        return context;
    }

    // Try Hasura first (if configured)
    if (process.env.HASURA_HOST && process.env.HASURA_PASSWORD) {
        try {
            const userData = await authenticateViaHasura(userId);
            if (userData) {
                const context = authManager.createContext(userData);
                authManager.setContext(context);
                return context;
            }
        } catch (error) {
            console.error('[Auth] Hasura auth failed, falling back to env:', error.message);
        }
    }

    // Fallback to environment variables
    const userRoles = process.env.ORBIOS_USER_ROLES 
        ? process.env.ORBIOS_USER_ROLES.split(',') 
        : [];

    const context = authManager.createContext({
        user_id: userId,
        username: process.env.ORBIOS_USERNAME || userId,
        roles: userRoles,
    });
    
    authManager.setContext(context);
    return context;
}
```

## Step 6: Test Hasura Auth

```bash
# Set Hasura credentials
export HASURA_HOST=localhost
export HASURA_PORT=5433  # Via SSH tunnel
export HASURA_PASSWORD=your_password

# Set your Discord user ID
export ORBIOS_USER_ID=your_discord_id

# Start MCP server
npm start

# The server should now fetch your roles from Hasura
```

Check the logs for:
```
[Hasura Auth] Fetching user data for: 123456789012345678
[Hasura Auth] User found: YourUsername
[Hasura Auth] Roles: ["1446244355479306260"]
```

## Step 7: Production Configuration

For production deployment on the server:

```bash
# On do-sgp1-ops
cd /path/to/mcp-server

# Create .env file
cat > .env << EOF
# Hasura (local connection on server)
HASURA_HOST=localhost
HASURA_PORT=5432
HASURA_DATABASE=postgres
HASURA_USER=postgres
HASURA_PASSWORD=your_password

# Discord
DISCORD_GUILD_ID=1414519140861083792

# Environment
NODE_ENV=production
EOF

# Restart MCP server
pm2 restart mcp-server
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Check SSH tunnel is active
- Verify port number
- Check PostgreSQL is running: `docker ps | grep postgres`

### Authentication Failed

```
Error: password authentication failed for user "postgres"
```

**Solution:**
- Verify password in `.env`
- Check PostgreSQL user exists
- Try connecting with `psql` first

### Table Not Found

```
Error: relation "users" does not exist
```

**Solution:**
- Run schema inspector to see actual table names
- Update queries in `hasura-auth.js`
- Or create missing tables (see Step 3)

### No Roles Returned

```
[Hasura Auth] User found but no roles
```

**Solution:**
- Check `user_roles` table has data
- Verify guild_id matches: `1414519140861083792`
- Populate roles from Discord bot sync

## Next Steps

After Hasura integration works:

1. **Populate User Data**
   - Sync Discord users to database
   - Sync roles from Discord bot

2. **Test with Team**
   - Have team members test auth
   - Verify role mapping works

3. **Monitor**
   - Check audit logs
   - Monitor database connections
   - Track auth failures

4. **Optimize**
   - Add connection pooling
   - Cache user data
   - Add rate limiting

## Reference

- **Schema Inspector:** `scripts/inspect-hasura-schema.js`
- **Auth Module:** `src/auth/hasura-auth.js`
- **Auth Manager:** `src/auth/auth-manager.js`
- **Environment Template:** `.env.example`
