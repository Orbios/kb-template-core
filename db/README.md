# Database Directory (CORE)

**Purpose:** Store team data including users, availability schedules, and recruitment information that requires restricted access.

**Access:** Only **core-team** members (contains sensitive team information).

---

## What is stored here

This directory contains **team data**:

- **User profiles** (`users/`) — Team member information, profiles, avatars
- **Availability schedules** (`availability/`) — Weekly availability data for team members

---

## Directory Structure

- **`users/`** — User profiles and avatars
- **`availability/`** — Weekly availability schedules by year

---

## When to use this directory

✅ **Use this directory when:**
- Storing team member profiles and information
- Managing availability schedules
- Team data that should not be publicly accessible

❌ **Do NOT use this directory for:**
- Public team information (use public repository if appropriate)
- Client data (use `context/clients/`)
- Project data (use `context/projects/`)

---

## Security & Access

- **All content is confidential**
- Access restricted to **core-team** members only
- Do not share user data outside the core-team
- Follow data privacy regulations
- Review access permissions regularly

---

## Related Documentation

- Users Module: `orbios-kb-public/structure/modules/users.md`
- Availability Module: `orbios-kb-public/structure/modules/availability.md`
- Recruitment Data: `../context/internal/hr/recruitment/`
- Main README: `../README.md`

---

**Last Updated**: 2026-01-06

