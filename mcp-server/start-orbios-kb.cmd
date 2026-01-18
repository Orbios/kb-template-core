@echo off
cd /d "%~dp0"
:: Ensure dependencies are installed if needed, but assume they are
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
echo Starting Orbios KB MCP Server...
node src/server.js
