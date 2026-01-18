# ✅ Hasura Integration - COMPLETE & TESTED

**Date:** 2025-12-22  
**Status:** ✅ Production Ready  
**Database:** orbios_hub @ 159.65.133.226:5432

---

## 🎉 Success!

Hasura authentication is **fully functional** and tested with real users from the database!

### Test Results

**Test 1: Guest User (ira_valchak)**
```json
{
  "discord_id": "1081976370021814486",
  "username": "ira_valchak",
  "db_roles": [{"role_name": "guest"}],
  "mapped_roles": ["1446245138612891658"],  // → PUBLIC
  "kb_role": "public"
}
```
✅ Correctly mapped to PUBLIC role

**Test 2: Admin User (orbios_andrew)**
```json
{
  "discord_id": "1075778311671791706",
  "username": "orbios_andrew",
  "db_roles": [
    {"role_name": "admin"},
    {"role_name": "dev"},
    {"role_name": "member"}
  ],
  "mapped_roles": [
    "1446244355479306260",  // → ADMIN
    "1446245072290058260",  // → DEV
    "1446245138612891658"   // → MEMBER
  ],
  "kb_role": "admin"  // Highest role wins
}
```
✅ Correctly mapped to ADMIN role

---

## Database Schema

### Tables Used

**users**
- `id` (integer, primary key)
- `discord_id` (text, unique)
- `username` (text)
- `email` (text)
- `created_at` (timestamp)

**roles**
- `id` (integer, primary key)
- `role_name` (text): `guest`, `member`, `dev`, `admin`
- `description` (text)

**user_roles** (junction table)
- `user_id` (integer, FK to users)
- `role_id` (integer, FK to roles)

### Role Mapping

Database Role → Discord Role ID → KB Role:
```
admin  → 1446244355479306260 → admin
dev    → 1446245072290058260 → member
member → 1446245138612891658 → public
guest  → 1446245138612891658 → public
```

---

## Configuration

### Environment Variables

```env
# Database connection
HASURA_HOST=159.65.133.226
HASURA_PORT=5432
HASURA_DATABASE=orbios_hub
HASURA_USER=orbios
HASURA_PASSWORD=wf3354%#re

# User to authenticate
ORBIOS_USER_ID=your_discord_id
```

### Testing Commands

```bash
# Test Hasura auth with specific user
$env:HASURA_HOST='159.65.133.226'
$env:HASURA_PORT='5432'
$env:HASURA_DATABASE='orbios_hub'
$env:HASURA_USER='orbios'
$env:HASURA_PASSWORD='wf3354%#re'

# Test with guest user
node scripts/test-hasura-auth.js 1081976370021814486

# Test with admin user
node scripts/test-hasura-auth.js 1075778311671791706
```

---

## How It Works

### Authentication Flow

```
1. User provides Discord ID
   ↓
2. Query database for user + roles
   ↓
3. Map database roles to Discord role IDs
   ↓
4. Existing RBAC system determines KB role
   ↓
5. User authenticated with proper permissions
```

### Smart Fallback

The system tries authentication in this order:

```
1. Hasura (if HASURA_HOST + HASURA_PASSWORD set)
   ↓ (if fails)
2. Environment variables (ORBIOS_USER_ROLES)
   ↓ (if no user)
3. Anonymous (public role)
```

---

## Files Modified

```
mcp-server/
├── src/auth/
│   └── hasura-auth.js          ✨ Updated for real schema
└── scripts/
    └── test-hasura-auth.js     🆕 Test script
```

### Key Changes

**hasura-auth.js:**
- Updated queries to match actual database schema
- Added role mapping: DB roles → Discord role IDs
- Proper error handling and logging
- Returns data compatible with existing RBAC

---

## Production Deployment

### On do-sgp1-ops

```bash
# Navigate to MCP server directory
cd /path/to/mcp-server

# Create .env file
cat > .env << 'EOF'
# Hasura (local connection on server)
HASURA_HOST=localhost
HASURA_PORT=5432
HASURA_DATABASE=orbios_hub
HASURA_USER=orbios
HASURA_PASSWORD=wf3354%#re

# Discord
DISCORD_GUILD_ID=1414519140861083792

# Environment
NODE_ENV=production
EOF

# Secure the file
chmod 600 .env

# Test authentication
export ORBIOS_USER_ID=1075778311671791706
node scripts/test-hasura-auth.js

# If successful, restart MCP server
pm2 restart mcp-server
# or
systemctl restart mcp-server
```

### Verify Production

```bash
# Check logs
pm2 logs mcp-server | grep "Hasura Auth"

# Should see:
# [Hasura Auth] User authenticated: { ... }
```

---

## Known Users in Database

```
Discord ID           | Username       | Roles
---------------------|----------------|------------------
1075778311671791706  | orbios_andrew  | admin, dev, member
1081976370021814486  | ira_valchak    | guest
403819286445162498   | vrtem          | guest
1019887642164346920  | erik_sytnyk    | (check roles)
```

---

## Next Steps

### Immediate

1. ✅ Hasura auth tested and working
2. ⏭️ Deploy to production server
3. ⏭️ Test with team members
4. ⏭️ Monitor auth logs

### Future (Phase 3: OAuth)

1. Discord OAuth application
2. Web-based login flow
3. JWT token generation
4. Session persistence

---

## Troubleshooting

### User Not Found

**Problem:** `User not found: <discord_id>`

**Solutions:**
1. Verify Discord ID is correct (check database)
2. User might not be in `users` table
3. Check `discord_id` column matches exactly

### Connection Failed

**Problem:** `ECONNREFUSED` or timeout

**Solutions:**
1. Verify database host/port
2. Check firewall rules
3. Test with: `ssh do-sgp1-ops 'docker exec hasura-hasura-1 psql ...'`

### Wrong Roles

**Problem:** User has wrong KB role

**Solutions:**
1. Check `user_roles` table
2. Verify role mapping in `hasura-auth.js`
3. Check role priority (highest wins)

---

## Testing Checklist

- [x] Database connection works
- [x] Schema inspector shows correct tables
- [x] Guest user authenticates correctly
- [x] Admin user authenticates correctly
- [x] Roles map to Discord IDs correctly
- [x] RBAC system receives correct roles
- [x] Fallback to env vars works
- [ ] Production deployment
- [ ] Team testing

---

## Support

**Test Commands:**
```bash
# Inspect database
node scripts/inspect-hasura-schema.js

# Test auth
node scripts/test-hasura-auth.js <discord_id>

# Run RBAC tests
node tests/auth.test.js
```

**Documentation:**
- `HASURA-SETUP.md` - Setup guide
- `src/auth/README.md` - Auth module docs
- `docs/architecture/auth-phase2-hasura.md` - Implementation guide

---

**🎉 Phase 2 Complete!**

Hasura integration is fully functional and tested with real production data. The system can now authenticate users from the database and apply proper role-based access control.
