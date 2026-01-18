# Hasura Local Management Setup

## Install Hasura CLI

```powershell
# Windows (PowerShell)
npm install -g hasura-cli

# Or using Chocolatey
choco install hasura-cli

# Or download from: https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/
```

## Initialize Hasura Project

```bash
cd mcp-server
hasura init hasura --endpoint http://159.65.133.226:8080
```

## Configure Connection

Edit `mcp-server/hasura/config.yaml`:

```yaml
version: 3
endpoint: http://159.65.133.226:8080
admin_secret: 6hw3$@1&xAsZpE!k@rj
metadata_directory: metadata
migrations_directory: migrations
seeds_directory: seeds
```

## Common Commands

```bash
cd mcp-server/hasura

# Open console locally (better than web)
hasura console

# Apply migrations
hasura migrate apply

# Export current schema
hasura metadata export

# Create migration
hasura migrate create "add_user_roles_view" --sql-from-file ../hasura-views.sql

# Apply SQL
hasura migrate apply --version <version>

# Seed data
hasura seed apply
```

## VSCode Extensions

Install these:
1. **GraphQL** (GraphQL Foundation) - Syntax highlighting
2. **Hasura GraphQL** (Hasura) - Schema viewer
3. **PostgreSQL** (Chris Kolkman) - SQL editing

## Workflow

```bash
# 1. Start local console
hasura console

# 2. Make changes in browser (localhost:9695)
# 3. Changes auto-saved to migrations/
# 4. Commit migrations to git
# 5. Apply on server: hasura migrate apply
```

## Benefits

✅ Version control for schema changes
✅ Local console (faster than remote)
✅ Migration files (git-trackable)
✅ Rollback support
✅ Team collaboration

## Alternative: GraphQL Playground

```bash
# Install
npm install -g graphql-playground

# Run
graphql-playground
# Then connect to: http://159.65.133.226:8080/v1/graphql
```
