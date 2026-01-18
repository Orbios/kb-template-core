# 🔐 Quick Auth Setup for Team Members

## One-Command Setup (30 seconds!)

```bash
npm run auth-setup
```

That's it! The script will:
1. Ask you to press Enter
2. Open Discord in your browser
3. You click "Authorize"
4. Automatically saves your info
5. Tests your authentication
6. Shows your role

**No copying Discord IDs, no manual config!**

---

## What You'll See

```bash
$ npm run auth-setup

🔐 Orbios MCP - Discord Login

📋 Authentication Flow:

1. Browser will open to Discord login
2. Click "Authorize" to allow Orbios MCP
3. Browser will show success message
4. Return here - you'll be authenticated!

Press Enter to open Discord login in your browser...
```

**Press Enter** → Browser opens → Click **"Authorize"** → Done!

```
✅ Authentication successful!

Welcome, YourUsername!
Discord ID: 123456789012345678

✅ Configuration saved
✅ Database authentication successful!
   Role: dev

🎉 Setup complete!

You can now start the MCP server:
  cd mcp-server
  npm start
```

---

## What Happens Behind the Scenes

1. Script starts a temporary local server
2. Opens Discord OAuth page in your browser
3. You authorize the app
4. Discord sends your info back to the local server
5. Script saves your Discord ID to `.env`
6. Tests your database authentication
7. Shows your role (admin/dev/member/guest)
8. Shuts down the local server

**Your credentials never leave your machine!**

---

## Troubleshooting

### "Discord OAuth app not configured"

Contact admin - they need to set up the Discord OAuth application first.
See: `DISCORD-OAUTH-SETUP.md`

### "User not found in database"

Your Discord account isn't in the database yet. Contact admin to add you with proper roles.

### "Port 8765 already in use"

Something else is using that port. Close other applications or contact support.

### Browser doesn't open automatically

The script will show you a URL to open manually:
```
https://discord.com/oauth2/authorize?client_id=...
```

---

## Your Permissions

After authentication, your role determines what you can do:

- **guest**: Read public content only
- **member**: Basic access to team tools
- **dev**: Developer tools and features
- **admin**: Full system access

Your role is automatically fetched from the database based on your Discord account.

---

## Re-authenticating

To login with a different Discord account:

```bash
# Delete existing config
rm mcp-server/.env

# Run setup again
npm run auth-setup
```

---

## Privacy & Security

- ✅ OAuth happens locally (localhost:8765)
- ✅ No passwords stored
- ✅ Only requests basic Discord info (ID, username)
- ✅ No server permissions requested
- ✅ Credentials saved only on your machine
- ✅ Database password never exposed to you

---

## Next Steps

After successful authentication:

```bash
cd mcp-server
npm start
```

The MCP server will:
- Load your Discord ID from `.env`
- Connect to the database
- Fetch your roles
- Apply permissions automatically

You're ready to go! 🚀
