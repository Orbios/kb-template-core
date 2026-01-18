-- SQL Views for Easier User & Role Management
-- Run these in Hasura Console → Data → SQL

-- ============================================
-- View: user_roles_view
-- Purpose: See all users with their roles in one query
-- ============================================

CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
    u.id as user_id,
    u.discord_id,
    u.username,
    u.email,
    u.created_at,
    u.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'role_id', r.id,
                'role_name', r.role_name,
                'role_description', r.description
            )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::json
    ) as roles,
    -- Highest role for easy filtering
    CASE 
        WHEN bool_or(r.role_name = 'admin') THEN 'admin'
        WHEN bool_or(r.role_name = 'dev') THEN 'dev'
        WHEN bool_or(r.role_name = 'member') THEN 'member'
        ELSE 'guest'
    END as primary_role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.discord_id, u.username, u.email, u.created_at, u.updated_at;

-- ============================================
-- View: active_users_with_roles
-- Purpose: Only active users with their roles
-- ============================================

CREATE OR REPLACE VIEW active_users_with_roles AS
SELECT 
    u.id,
    u.discord_id,
    u.username,
    u.email,
    array_agg(r.role_name) as role_names,
    string_agg(r.role_name, ', ') as roles_display,
    CASE 
        WHEN 'admin' = ANY(array_agg(r.role_name)) THEN 'admin'
        WHEN 'dev' = ANY(array_agg(r.role_name)) THEN 'dev'
        WHEN 'member' = ANY(array_agg(r.role_name)) THEN 'member'
        ELSE 'guest'
    END as kb_role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.is_active = true OR u.is_active IS NULL
GROUP BY u.id, u.discord_id, u.username, u.email;

-- ============================================
-- View: role_members
-- Purpose: See who has each role
-- ============================================

CREATE OR REPLACE VIEW role_members AS
SELECT 
    r.id as role_id,
    r.role_name,
    r.description as role_description,
    COUNT(DISTINCT ur.user_id) as member_count,
    json_agg(
        json_build_object(
            'user_id', u.id,
            'discord_id', u.discord_id,
            'username', u.username
        )
    ) FILTER (WHERE u.id IS NOT NULL) as members
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
LEFT JOIN users u ON ur.user_id = u.id
GROUP BY r.id, r.role_name, r.description;

-- ============================================
-- After creating views, track them in Hasura:
-- ============================================

-- 1. Go to Hasura Console → Data → SQL
-- 2. Paste and run the above SQL
-- 3. Go to Data → Schema → Public → Views
-- 4. Click "Track" on each view:
--    - user_roles_view
--    - active_users_with_roles
--    - role_members
-- 5. Now you can query them in GraphQL!

-- ============================================
-- Example GraphQL Queries:
-- ============================================

/*
# Get all users with their roles
query {
  user_roles_view {
    discord_id
    username
    roles
    primary_role
  }
}

# Get active users grouped by role
query {
  active_users_with_roles(order_by: {kb_role: asc}) {
    username
    kb_role
    roles_display
  }
}

# See who has each role
query {
  role_members {
    role_name
    member_count
    members
  }
}
*/

-- ============================================
-- Permissions for Views:
-- ============================================

-- Admin: Full access to all views
-- Team: Can see user_roles_view and active_users_with_roles
-- Member: Can only see their own data
-- Public: No access

-- Set these in Hasura Console → Data → [View] → Permissions
