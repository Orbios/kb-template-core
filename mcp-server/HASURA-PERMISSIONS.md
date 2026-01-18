# Hasura Permission Rules

## Overview

This document defines the row-level security (RLS) rules for each role in the Orbios KB system.

## Role Hierarchy

```
admin (full access)
  ↓
team (team resources + public)
  ↓
member (assigned tasks + public)
  ↓
public (public content only)
```

## Permission Rules by Table

### Users Table

**admin:**
```json
{
  "select": {
    "filter": {},
    "allow_aggregations": true
  },
  "insert": {
    "check": {}
  },
  "update": {
    "filter": {},
    "check": {}
  },
  "delete": {
    "filter": {}
  }
}
```

**team:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "id": { "_eq": "X-Hasura-User-Id" } },
        { "access_level": { "_in": ["public", "team"] } }
      ]
    }
  }
}
```

**member:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "id": { "_eq": "X-Hasura-User-Id" } },
        { "access_level": { "_eq": "public" } }
      ]
    }
  }
}
```

**public:**
```json
{
  "select": {
    "filter": {
      "access_level": { "_eq": "public" }
    }
  }
}
```

### Missions Table

**admin:**
- Full access (no filters)

**team:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "access_level": { "_in": ["public", "team"] } },
        { "created_by": { "_eq": "X-Hasura-User-Id" } }
      ]
    }
  },
  "insert": {
    "check": {
      "created_by": { "_eq": "X-Hasura-User-Id" }
    }
  },
  "update": {
    "filter": {
      "_or": [
        { "created_by": { "_eq": "X-Hasura-User-Id" } },
        { "access_level": { "_eq": "team" } }
      ]
    }
  }
}
```

**member:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "access_level": { "_eq": "public" } },
        {
          "_and": [
            { "access_level": { "_eq": "team" } },
            { "participants": { "_contains": "X-Hasura-User-Id" } }
          ]
        }
      ]
    }
  }
}
```

**public:**
```json
{
  "select": {
    "filter": {
      "access_level": { "_eq": "public" }
    }
  }
}
```

### Discord Messages Table

**admin:**
- Full access

**team:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "channel_access_level": { "_in": ["public", "team"] } },
        { "user_id": { "_eq": "X-Hasura-User-Id" } }
      ]
    }
  }
}
```

**member:**
```json
{
  "select": {
    "filter": {
      "_or": [
        { "channel_access_level": { "_eq": "public" } },
        { "user_id": { "_eq": "X-Hasura-User-Id" } }
      ]
    }
  }
}
```

**public:**
```json
{
  "select": {
    "filter": {
      "channel_access_level": { "_eq": "public" }
    }
  }
}
```

## Implementing Permissions in Hasura Console

### Step 1: Access Hasura Console

```bash
# Open Hasura console
https://your-hasura-endpoint/console
```

### Step 2: For Each Table

1. Go to **Data** → Select table → **Permissions**
2. Click on the role (admin, team, member, public)
3. Click **Edit** for each operation (select, insert, update, delete)
4. Set the permission rules as defined above

### Step 3: Test Permissions

Use the GraphiQL interface with different JWT tokens:

```graphql
# Test as member
query {
  missions {
    id
    title
    access_level
  }
}
```

Should only return missions where:
- `access_level = 'public'` OR
- User is in `participants` array

## Column-Level Permissions

### Sensitive Columns

Some columns should be hidden from certain roles:

**Users table:**
- `email`: Only visible to admin and self
- `created_at`: Visible to all
- `updated_at`: Visible to all

**Missions table:**
- `budget`: Only admin
- `internal_notes`: Only admin and team
- `status`: Visible to all

### Example Column Permission

For `users.email`:

**admin:** All columns  
**team:** All except `password_hash`  
**member:** Only if `id = X-Hasura-User-Id`  
**public:** Only `id`, `username`, `avatar_url`

## Testing Permissions

### Test Script

```javascript
// test-permissions.js
import { generateHasuraJWT } from './src/auth/jwt.js';

async function testPermissions() {
  // Generate tokens for different roles
  const adminToken = generateHasuraJWT({
    userId: '1075778311671791706',
    role: 'admin'
  });
  
  const memberToken = generateHasuraJWT({
    userId: '403819286445162498',
    role: 'member'
  });
  
  // Test query
  const query = `
    query {
      missions {
        id
        title
        access_level
      }
    }
  `;
  
  // Test as admin
  const adminResult = await fetch('https://hasura/v1/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  console.log('Admin sees:', await adminResult.json());
  
  // Test as member
  const memberResult = await fetch('https://hasura/v1/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${memberToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  console.log('Member sees:', await memberResult.json());
}
```

## Common Patterns

### Pattern 1: Owner or Public

```json
{
  "_or": [
    { "created_by": { "_eq": "X-Hasura-User-Id" } },
    { "access_level": { "_eq": "public" } }
  ]
}
```

### Pattern 2: Role-Based Access Level

```json
{
  "access_level": {
    "_in": ["public", "team"]  // Adjust based on role
  }
}
```

### Pattern 3: Participant Check

```json
{
  "participants": {
    "_contains": "X-Hasura-User-Id"
  }
}
```

### Pattern 4: Hierarchical Access

```json
{
  "_or": [
    { "access_level": { "_lte": "X-Hasura-Role-Level" } },
    { "owner_id": { "_eq": "X-Hasura-User-Id" } }
  ]
}
```

## Migration Checklist

- [ ] Add `access_level` column to all tables
- [ ] Set default `access_level = 'public'`
- [ ] Migrate existing data with appropriate access levels
- [ ] Define permissions for each role
- [ ] Test with different user roles
- [ ] Verify data isolation
- [ ] Document any exceptions

## Security Best Practices

1. **Deny by Default**: Start with no access, grant explicitly
2. **Test Thoroughly**: Test each role with real queries
3. **Audit Regularly**: Review permissions periodically
4. **Least Privilege**: Give minimum necessary access
5. **Document Exceptions**: Note any special cases

## Next Steps

After setting up permissions:
1. Test with real user tokens
2. Verify data filtering works
3. Update MCP server to use JWT
4. Remove direct DB access from team
