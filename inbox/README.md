# Email Inbox Archive

## Purpose

This directory stores archived email threads from Orbios email accounts. All non-spam emails are saved here for reference and knowledge base integration.

**Access**: Core Team only (contains internal communications)

## Structure

Emails are organized by month in the following structure:

```
inbox/
├── README.md
├── YYYY-MM/
│   ├── thread-name-1.md
│   ├── thread-name-2.md
│   └── ...
└── ...
```

### Naming Convention

- **Directory**: `YYYY-MM` format (e.g., `2026-01`)
- **Files**: `thread-name.md` (kebab-case, descriptive)

### File Format

Each email thread should be saved as a markdown file with:

```markdown
# [Email Subject]

**From**: sender@example.com  
**To**: contact@orbios.io  
**Date**: YYYY-MM-DD HH:MM  
**Thread**: [if part of conversation]

## Content

[Email body content]

## Attachments

- [attachment-name.pdf] (if any)

## Classification

- **Department**: [market / dev / ops / other]
- **Priority**: [high / medium / low]
- **Type**: [lead / inquiry / support / other]
- **Related Mission**: [mission ID if applicable]

## Notes

[Any additional notes or context]
```

## Current Status

- **Status**: Setup in progress (AT-014)
- **Automation**: Not yet implemented
- **Manual Process**: Important emails should be manually saved here

## Future Automation

Once automated archiving is implemented (Stage 2 of AT-014), emails will be automatically:
- Filtered for spam
- Classified by importance
- Saved to appropriate month directory
- Tagged with department and priority

## Related Documentation

- Email Routing: `context/infrastructure/email-routing.md`
- Action Ticket: `actions/AT-014.md`

