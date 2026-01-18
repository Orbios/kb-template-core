# Orbios MCP Authentication - Quick Reference

## 🎯 What Is This?

The MCP server now has **Role-Based Access Control (RBAC)**. Your Discord role determines which tools you can use.

## 👥 Your Role

Your Discord role automatically maps to an access level:

| Your Discord Role | Access Level | What You Can Do |
|-------------------|--------------|-----------------|
| **Core Lead** (Board) | `admin` | Everything |
| **Dev Lead** (TF Lead) | `team` | Team tools, missions, search |
| **Dev** (Member) | `member` | Your tasks, public info |
| **Open** (Community) | `public` | Read public content only |

## 🔧 How to Use (Development)

### Step 1: Find Your Discord User ID

1. Open Discord
2. Settings → Advanced → Enable Developer Mode
3. Right-click your name → Copy ID
4. Your ID looks like: `123456789012345678`

### Step 2: Find Your Role IDs

Right-click your roles in the server → Copy ID

**Known Role IDs:**
- Core Lead: `1446244355479306260`
- Dev Lead: `1446245005663535298`
- Dev: `1446245072290058260`
- Open: `1446245138612891658`

### Step 3: Configure MCP

Create `.env` file in `mcp-server/`:

```env
ORBIOS_USER_ID=your_discord_user_id
ORBIOS_USER_ROLES=your_role_id_1,your_role_id_2
```

**Example (Core Lead):**
```env
ORBIOS_USER_ID=123456789012345678
ORBIOS_USER_ROLES=1446244355479306260
```

**Example (Dev):**
```env
ORBIOS_USER_ID=987654321098765432
ORBIOS_USER_ROLES=1446245072290058260
```

### Step 4: Restart MCP Server

```bash
cd mcp-server
npm start
```

## ✅ What You Can Do

### Admin (Core Lead)

✅ **Everything** - Full access to all tools

### Team (Dev Lead)

✅ Create/update missions  
✅ Team management tools  
✅ Search all team data  
✅ Discord summaries  
❌ GraphQL direct access  
❌ User profile creation  

### Member (Dev)

✅ Daily status/tasks  
✅ Search public + your assigned data  
✅ Read missions you're assigned to  
❌ Create missions  
❌ Team management  
❌ GraphQL access  

### Public (Community)

✅ Search public documentation  
❌ Everything else  

## 🧪 Testing

Test your access:

```bash
cd mcp-server
node tests/auth.test.js
```

## ❌ What Happens If Denied?

You'll see:

```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Access denied: Role 'public' cannot use tool 'missions_create'"
  }
}
```

## 📊 Full Permission Matrix

See: `mcp-server/src/auth/README.md`

## 🔒 Security Notes

**Current Mode:** Development (env-based)  
**Production Mode:** Coming soon (Hasura + OAuth)

In development, you manually set your role. In production, it will be fetched from the database automatically.

## 🆘 Troubleshooting

### "Access Denied" but I should have access

1. Check your `.env` file has correct IDs
2. Restart the MCP server
3. Verify your Discord role in the server

### Tests failing

```bash
# Make sure you're in the right directory
cd mcp-server

# Run tests
node tests/auth.test.js
```

### Can't find my Discord ID

1. Discord → Settings → Advanced
2. Enable "Developer Mode"
3. Right-click your name → Copy ID

## 📚 More Info

- **Full Docs:** `mcp-server/src/auth/README.md`
- **Implementation:** `docs/architecture/auth-implementation-summary.md`
- **Design:** `docs/architecture/auth-system.md`

---

**Questions?** Ask in `#team-fusion-dev` on Discord
