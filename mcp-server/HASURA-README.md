# Hasura Management

## For Admins Only

Hasura configuration files are in your **personal addon** directory, not in the public repo.

**Location:** `orbios_kb_public-personal-addon/hasura-config/`

## Setup

1. Download Hasura CLI:
   ```bash
   cd mcp-server
   curl -L https://github.com/hasura/graphql-engine/releases/latest/download/cli-hasura-windows-amd64.exe -o hasura.exe
   ```

2. Initialize (if not done):
   ```bash
   .\hasura.exe init hasura --endpoint http://159.65.133.226:8080 --admin-secret "YOUR_SECRET"
   ```

3. Open console:
   ```bash
   cd hasura
   ..\hasura.exe console
   ```

## Why Not in Public Repo?

- Contains admin secret
- Contains database connection details
- Personal configuration

## Team Members

You don't need Hasura CLI. Use:
- `npm run auth-setup` for login
- MCP tools for queries
