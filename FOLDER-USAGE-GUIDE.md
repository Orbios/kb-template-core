# Folder Usage Guide - orbios-kb-core

**Repository**: [`orbios-kb-core`](https://github.com/Orbios/orbios-kb-core)

Quick reference guide for when to use each folder in the core repository.

## Quick Decision Tree

```
Is it confidential/internal? 
├─ NO → Use orbios-kb-public
└─ YES → Continue...

What type of content?
├─ Static knowledge/documentation → context/
│   ├─ Client info → context/clients/
│   ├─ Project details → context/projects/
│   ├─ Financial info → context/finances/
│   ├─ Internal discussions → context/internal/
│   └─ Infrastructure docs → context/infrastructure/
│
├─ Review/evaluation → reviews/
│   ├─ TF-Review → reviews/YYYY-MM-DD_tf_review_subject.md
│   └─ Other reviews → reviews/YYYY-MM-DD_review_type_subject.md
│
├─ Update/status report → updates/
│   ├─ Daily log → updates/daily_logs/YYYY/MM/YYYY-MM-DD.md
│   └─ Other updates → updates/YYYY-MM-DD_update_type.md
│
├─ Mission/TF-mission → missions/
│
├─ Action Ticket (AT) → actions/
│
├─ Team data (users, availability, recruitment) → db/
│
└─ Archived email → inbox/YYYY-MM/thread-name.md
```

## Detailed Folder Usage

### 📁 `context/` - Static Knowledge

**When to use**: Long-term reference documentation, knowledge that doesn't change frequently.

**Subfolders**:

| Folder | Use When | Example |
|--------|----------|---------|
| `clients/` | Client information, NDA-protected data, client agreements | `clients/acme-corp-agreement.md` |
| `projects/` | Confidential project details, technical specs | `projects/internal-tool-development.md` |
| `finances/` | Budgets, expenses, financial analytics | `finances/q1-2026-budget.md` |
| `internal/` | Internal discussions, working notes, decisions | `internal/team-meeting-notes-2026-01.md` |
| `internal/hr/` | HR processes, recruitment, onboarding, access management | `internal/hr/recruitment/candidates/` |
| `internal/hr/onboarding/` | Individual onboarding plans and documentation | `internal/hr/onboarding/anton_onboarding_plan_december_2025.md` |
| `internal/hr/alumni/` | Alumni network and former team member profiles | `internal/hr/alumni/alumni_database_december_2025.md` |
| `infrastructure/` | Internal infrastructure, email routing, automation | `infrastructure/email-routing.md` |

**❌ Don't use for**: Public documentation, templates (use public repo)

---

### 📁 `reviews/` - Reviews and Evaluations

**When to use**: Reviews, evaluations, feedback, audits.

**Types**:
- **TF-Review**: `YYYY-MM-DD_tf_review_subject.md` - For AI-assisted reviews (Lana АКМ)
- **Other reviews**: `YYYY-MM-DD_review_type_subject.md` - Client reviews, project reviews, etc.

**Examples**:
- `2026-01-06_tf_review_email-automation-plan.md`
- `2026-01-10_client_review_project-alpha.md`
- `2026-01-15_internal_review_process-improvement.md`

**❌ Don't use for**: Public reviews (use public repo)

---

### 📁 `updates/` - Updates and Status Reports

**When to use**: Regular updates, status reports, progress updates.

**Subfolders**:
- **Daily logs**: `daily_logs/YYYY/MM/YYYY-MM-DD.md`
- **Other updates**: `updates/YYYY-MM-DD_update_type.md`

**Examples**:
- `updates/daily_logs/2026/01/2026-01-06.md`
- `updates/2026-01-10_client_update_project-beta.md`
- `updates/2026-01-15_internal_status_report.md`

**❌ Don't use for**: Public updates (use public repo)

---

### 📁 `missions/` - TF-Missions

**When to use**: Task force missions, strategic initiatives, internal missions.

**Examples**:
- `missions/internal-process-automation.md`
- `missions/client-onboarding-improvement.md`

**❌ Don't use for**: Public missions (use public repo)

---

### 📁 `actions/` - Action Tickets

**When to use**: Action Tickets (AT) for internal operations and tasks.

**Format**: `AT-XXX.md` (e.g., `AT-014.md`)

**Note**: README and template are in `orbios-kb-public/actions/`, but specific internal AT files are stored here.

**Examples**:
- `actions/AT-014.md` - Email routing centralization
- `actions/AT-015.md` - Internal process improvement

**❌ Don't use for**: Public action tickets (use public repo if appropriate)

---

### 📁 `db/` - Team Database

**When to use**: Team data including user profiles and availability schedules.

**Subfolders**:
- **`users/`** — User profiles, avatars, team member information
- **`availability/`** — Weekly availability schedules by year

**Examples**:
- `db/users/john-doe.yaml` — User profile
- `db/availability/2026/week-01-jan.yaml` — Weekly availability

**❌ Don't use for**: 
- Public team information (use public repo if appropriate)
- Recruitment data (use `context/internal/hr/recruitment/`)

---

### 📁 `inbox/` - Email Archive

**When to use**: Archived email threads, important emails that need to be saved.

**Structure**: `inbox/YYYY-MM/thread-name.md`

**Examples**:
- `inbox/2026-01/lead-partnership-inquiry.md`
- `inbox/2026-01/client-support-request.md`

**❌ Don't use for**: Public email documentation (use public repo if needed)

---

## Common Scenarios

### Scenario 1: Client Project Documentation

**Question**: Where to store client project details?

**Answer**: 
- Project details → `context/projects/client-project-name.md`
- Client info → `context/clients/client-name.md`
- Project updates → `updates/YYYY-MM-DD_client_update_project-name.md`
- Project reviews → `reviews/YYYY-MM-DD_client_review_project-name.md`

---

### Scenario 2: Internal Process Improvement

**Question**: Where to document internal process changes?

**Answer**:
- Process documentation → `context/internal/process-name.md`
- Action Ticket → `actions/AT-XXX.md`
- Review → `reviews/YYYY-MM-DD_internal_review_process-name.md`
- Updates → `updates/YYYY-MM-DD_internal_update_process-name.md`

---

### Scenario 3: Infrastructure Setup

**Question**: Where to document email routing, automation, etc.?

**Answer**:
- Infrastructure docs → `context/infrastructure/topic-name.md`
- Automation plan → `context/infrastructure/automation-plan.md`
- Review → `reviews/YYYY-MM-DD_tf_review_topic-name.md`

---

### Scenario 4: Daily Work Log

**Question**: Where to log daily activities?

**Answer**:
- Daily log → `updates/daily_logs/YYYY/MM/YYYY-MM-DD.md`

---

## Security Checklist

Before creating a document, verify:

- [ ] Content is confidential/internal (not public)
- [ ] No NDA violations
- [ ] Appropriate folder selected
- [ ] Template used (if available)
- [ ] Document name follows convention
- [ ] Content is in English
- [ ] Sensitive data is properly marked

---

## Related Guides

- **This Repository**: [`orbios-kb-core`](https://github.com/Orbios/orbios-kb-core)
- Main README: [`README.md`](README.md)
- Public Repository Guide: [`orbios-kb-public/README.md`](https://github.com/Orbios/orbios-kb-public)
- Board Repository Guide: [`orbios-kb-board/README.md`](https://github.com/Orbios/orbios-kb-board)

---

**Last Updated**: 2026-01-06

