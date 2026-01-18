# Hasura JWT Configuration Guide

## Overview

This guide explains how to configure Hasura to accept JWT tokens from the MCP server.

## Step 1: Generate JWT Secret

The JWT secret must be at least 256 bits (32 characters). Generate one:

```bash
# Generate a random 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

## Step 2: Configure Hasura Environment

On `do-sgp1-ops`, add the JWT configuration to Hasura's environment:

```bash
ssh do-sgp1-ops
cd /path/to/hasura  # Adjust to your Hasura installation path
```

Edit the Hasura environment file (usually `docker-compose.yml` or `.env`):

```yaml
# docker-compose.yml
services:
  hasura:
    environment:
      # Existing config...
      HASURA_GRAPHQL_JWT_SECRET: |
        {
          "type": "HS256",
          "key": "your-256-bit-secret-key-here"
        }
      
      # Optional: Enable JWT debugging
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
```

Or if using environment file:

```env
# .env
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"your-256-bit-secret-key-here"}
```

## Step 3: Restart Hasura

```bash
docker-compose restart hasura
# or
docker restart hasura-hasura-1
```

## Step 4: Verify JWT Configuration

Test that Hasura accepts JWT tokens:

```bash
# Generate a test token (run on your local machine)
cd mcp-server
node -e "
import('./src/auth/jwt.js').then(m => {
  const token = m.generateHasuraJWT({
    userId: '403819286445162498',
    role: 'member',
    allowedRoles: ['member', 'public']
  });
  console.log(token);
});
"
```

Then test with Hasura:

```bash
curl -X POST \
  https://your-hasura-endpoint/v1/graphql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id username } }"}'
```

If configured correctly, you should get a response (possibly empty if no permissions set yet).

## Step 5: Set JWT Secret in MCP

Update your local `.env` file to use the same secret:

```env
# Root .env file
HASURA_JWT_SECRET=your-256-bit-secret-key-here
```

**Important:** This secret must match the one in Hasura exactly.

## Security Notes

1. **Keep Secret Safe**: Never commit the JWT secret to git
2. **Use Strong Secret**: At least 256 bits of randomness
3. **Rotate Regularly**: Change the secret periodically
4. **Same Secret**: MCP and Hasura must use the same secret

## Troubleshooting

### "JWTInvalidClaims" Error

The JWT doesn't have the required Hasura claims. Check that your token includes:
- `https://hasura.io/jwt/claims`
- `x-hasura-user-id`
- `x-hasura-default-role`
- `x-hasura-allowed-roles`

### "JWTInvalid" Error

The JWT signature is invalid. Possible causes:
- Secret mismatch between MCP and Hasura
- Token expired
- Token corrupted

### "Missing Authorization Header"

You forgot to include the `Authorization: Bearer <token>` header.

## Next Steps

After JWT is configured:
1. Define permission rules (see `hasura-permissions.md`)
2. Test row-level security
3. Update MCP server to use JWT
