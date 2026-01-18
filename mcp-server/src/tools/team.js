import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { resolveKBPath, ensureDirectory, writeKBFile } from '../utils/path-utils.js';

// Helper to load constants
function loadConstants() {
    // Try to load from KB root first
    try {
        const constantsPath = resolveKBPath('.ai', 'constants.json');
        if (fs.existsSync(constantsPath)) {
            return JSON.parse(fs.readFileSync(constantsPath, 'utf8'));
        }
    } catch (e) {
        // Fallback or silent fail
    }
    return null;
}

// Helper to validate projects
function validateProjects(projectNames) {
    const constants = loadConstants();
    if (!constants || !constants.allowed_projects) return true; // weak fail open
    const allowed = new Set(constants.allowed_projects);
    const invalid = projectNames.filter(p => !allowed.has(p));
    return invalid.length === 0 ? true : invalid;
}

// --- Tools ---

// 1. User Profile Setup
export const userProfileCreate = async ({ firstName, lastName, email, role, accessCore, language }) => {
    const userJsonPath = '.ai/user.json';
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

    const user = {
        name: `${firstName} ${lastName}`,
        email,
        role,
        permissions: {
            access_core: accessCore
        },
        preferences: {
            language
        },
        username
    };

    // Note: This overrides user.json if it exists. 
    // This tool is for "Onboarding New User", so assuming single user context or updating it?
    // Orbios context: might be user-specific or global config.

    await writeKBFile(userJsonPath, JSON.stringify(user, null, 2));

    return { success: true, path: userJsonPath, user };
};

// 2. Daily Status Report
export const dailyStatusCreate = async ({ firstName, date, content, language = 'en' }) => {
    // Content is expected to be the pre-formatted markdown body or structured data?
    // Let's take structured data to enforce the "Project Name Validation" rule from the tool side!

    // We'll support two modes: 'raw_content' (legacy) or 'structured'
    // But for simpler MCP, let's take structured data.

    // Actually, taking raw markdown allows flexibility for the Agent to compose the text. 
    // BUT the prompt requirement was "CRITICAL: Project Name Validation".
    // So the tool MUST parse or receive the project names to validate them.

    // Let's define the input as structured:
    // entries: [{ project: String, hours: Number, progress: String }]
    // nextSteps: String

    const constants = loadConstants();

    if (!content.entries || !Array.isArray(content.entries)) {
        throw new Error("Invalid content: 'entries' array is required.");
    }

    // Validate Projects
    if (constants && constants.allowed_projects) {
        const allowed = new Set(constants.allowed_projects);
        const invalidProjects = content.entries
            .map(e => e.project)
            .filter(p => !allowed.has(p));

        if (invalidProjects.length > 0) {
            throw new Error(`CRITICAL ERROR: Invalid project name(s): ${invalidProjects.join(', ')}. Allowed: ${constants.allowed_projects.join(', ')}`);
        }
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date(date);
    const month = monthNames[d.getMonth()];

    // Core KB path: orbios-kb-core/updates/daily_logs/YYYY/MM/YYYY-MM-DD.md
    // OR orbios-kb-public/team/task-management/status_updates/Artem/January/2026-01-14.md
    // Based on user request "updates/daily_logs", let's switch to that structure?
    // Or keep "team/task-management" but ensure it goes to public repo?
    // The user previously mentioned: "updates/daily_logs" in orbios-kb-core.
    // But this tool is in orbios-kb-public repo.
    // Let's stick to the path defined in the prompt but ensure it resolves correctly relative to KB root.

    const relativePath = `team/task-management/status_updates/${firstName}/${month}/${date}.md`;

    // Construct Markdown using the new template format
    /*
    Date: YYYY-MM-DD (Kyiv) 
    Hours Worked Summary: X 
    Cluster/Project: (Core Zero / TF Dev / TF Ops / Marketing / Client:Name / Camp) 
    Today's Progress (Done):
    * ...
    Blockers/Risks:
    * (none) / ...
    Asks / Needed decisions:
    * (none) / ...
    Next Steps:
    * ...
    Links (optional):
    * ...
    */

    let totalHours = 0;
    const projectNames = [];
    const progressLines = [];

    for (const entry of content.entries) {
        totalHours += Number(entry.hours) || 0;
        if (entry.project) projectNames.push(entry.project);

        // Format progress: simple list items
        if (entry.progress) {
            // Split by lines if multiple lines in progress
            const lines = entry.progress.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    progressLines.push(line.trim());
                }
            });
        }
    }

    const uniqueProjects = [...new Set(projectNames)];
    const projectsStr = uniqueProjects.length > 0 ? uniqueProjects.join(' / ') : "(None)";

    let md = `Date: ${date} (Kyiv)\n`;
    md += `Hours Worked Summary: ${totalHours}\n`;
    md += `Cluster/Project: ${projectsStr}\n\n`;

    md += `Today's Progress (Done):\n\n`;
    if (progressLines.length > 0) {
        // Format as list with dashes
        const formattedProgress = progressLines.map(line => {
            const cleanLine = line.replace(/^[\*\-]\s+/, '');
            return `- ${cleanLine}`;
        });
        md += formattedProgress.join('\n') + '\n';
    } else {
        md += `(none)\n`;
    }

    md += `Blockers/Risks:\n\n`;
    if (content.blockers && content.blockers.trim()) {
        const blockerLines = content.blockers.split('\n');
        blockerLines.forEach(line => {
            if (line.trim()) {
                const cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
                md += `${cleanLine}\n`;
            }
        });
    } else {
        md += `(none)\n`;
    }

    md += `\nAsks / Needed decisions:\n\n`;
    if (content.asks && content.asks.trim()) {
        const askLines = content.asks.split('\n');
        askLines.forEach(line => {
            if (line.trim()) {
                const cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
                md += `${cleanLine}\n`;
            }
        });
    } else {
        md += `(none)\n`;
    }

    md += `\nNext Steps:\n\n`;
    if (content.nextSteps) {
        const nextStepLines = content.nextSteps.split('\n');
        nextStepLines.forEach(line => {
            if (line.trim()) {
                const cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
                md += `- ${cleanLine}\n`;
            }
        });
    } else {
        md += `(none)\n`;
    }

    md += `\nLinks (optional):\n`;
    if (content.links && content.links.trim()) {
        const linkLines = content.links.split('\n');
        linkLines.forEach(line => {
            if (line.trim()) {
                const cleanLine = line.trim().replace(/^[\*\-]\s+/, '');
                md += `${cleanLine}\n`;
            }
        });
    } else {
        md += `\n`;
    }

    await writeKBFile(relativePath, md);

    return { success: true, path: relativePath, invalidProjects: [] };
};

// 3. Daily Tasks Creation
export const dailyTasksCreate = async ({ firstName, date, tasks }) => {
    // tasks: { willDo: [], inProgress: [], finished: [] }

    const relativePath = `team/task-management/tasks/${firstName}/${date}.md`;
    // Assuming .md extension as per original code logic

    const yaml = await import('yaml');
    const yamlStr = yaml.stringify(tasks);

    await writeKBFile(relativePath, yamlStr);

    return { success: true, path: relativePath };
};

// 4. Availability
export const availabilityCreate = async ({ firstName, month, weekDates, schedule }) => {
    // schedule: { "YYYY-MM-DD": "09:00-18:00" }

    // Path: team/availability/{Month}/{DD-DD}/{FirstName}.md
    const relativePath = `team/availability/${month}/${weekDates}/${firstName}.md`;

    let md = `# Availability: ${firstName}\n`;
    md += `**Week**: ${weekDates}\n\n`;

    for (const [day, time] of Object.entries(schedule)) {
        md += `- **${day}**: ${time || "Day off"}\n`;
    }

    await writeKBFile(relativePath, md);

    return { success: true, path: relativePath };
};

// 5. HR Candidate Save
export const hrCandidateSave = async ({ category, role, lastName, firstName, score, content }) => {
    const filename = `${role}_${lastName}_${firstName}_${score}pts.md`.replace(/\s+/g, '_');
    const relativePath = `candidates/${category}/${filename}`;

    await writeKBFile(relativePath, content);

    return { success: true, path: relativePath };
}
