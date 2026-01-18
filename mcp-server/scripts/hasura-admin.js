#!/usr/bin/env node

/**
 * Local Hasura Management Tool
 * Manage users and roles via GraphQL from your terminal
 */

import { generateHasuraJWT } from '../src/auth/jwt.js';

const HASURA_ENDPOINT = 'http://159.65.133.226:8080/v1/graphql';
const ADMIN_SECRET = '6hw3$@1&xAsZpE!k@rj';

async function query(gql, variables = {}) {
    const response = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({ query: gql, variables })
    });

    const result = await response.json();
    if (result.errors) {
        throw new Error(JSON.stringify(result.errors, null, 2));
    }
    return result.data;
}

// ============================================
// Commands
// ============================================

async function listUsers() {
    const gql = `
        query {
            users(order_by: {username: asc}) {
                id
                discord_id
                username
                email
                user_roles {
                    role {
                        role_name
                    }
                }
            }
        }
    `;

    const data = await query(gql);
    console.log('\n📋 Users:\n');
    console.table(data.users.map(u => ({
        ID: u.id,
        Discord: u.discord_id,
        Username: u.username,
        Email: u.email,
        Roles: u.user_roles.map(ur => ur.role.role_name).join(', ')
    })));
}

async function listRoles() {
    const gql = `
        query {
            roles {
                id
                role_name
                description
                user_roles_aggregate {
                    aggregate {
                        count
                    }
                }
            }
        }
    `;

    const data = await query(gql);
    console.log('\n🎭 Roles:\n');
    console.table(data.roles.map(r => ({
        ID: r.id,
        Name: r.role_name,
        Description: r.description,
        Members: r.user_roles_aggregate.aggregate.count
    })));
}

async function addUserRole(userId, roleName) {
    // Get role ID
    const getRoleGql = `
        query($roleName: String!) {
            roles(where: {role_name: {_eq: $roleName}}) {
                id
            }
        }
    `;

    const roleData = await query(getRoleGql, { roleName });
    if (roleData.roles.length === 0) {
        throw new Error(`Role "${roleName}" not found`);
    }

    const roleId = roleData.roles[0].id;

    // Add user_role
    const addGql = `
        mutation($userId: uuid!, $roleId: uuid!) {
            insert_user_roles_one(object: {user_id: $userId, role_id: $roleId}) {
                user_id
                role_id
            }
        }
    `;

    await query(addGql, { userId, roleId });
    console.log(`✅ Added role "${roleName}" to user ${userId}`);
}

async function removeUserRole(userId, roleName) {
    // Get role ID
    const getRoleGql = `
        query($roleName: String!) {
            roles(where: {role_name: {_eq: $roleName}}) {
                id
            }
        }
    `;

    const roleData = await query(getRoleGql, { roleName });
    if (roleData.roles.length === 0) {
        throw new Error(`Role "${roleName}" not found`);
    }

    const roleId = roleData.roles[0].id;

    // Remove user_role
    const removeGql = `
        mutation($userId: uuid!, $roleId: uuid!) {
            delete_user_roles(where: {user_id: {_eq: $userId}, role_id: {_eq: $roleId}}) {
                affected_rows
            }
        }
    `;

    const result = await query(removeGql, { userId, roleId });
    console.log(`✅ Removed role "${roleName}" from user ${userId} (${result.delete_user_roles.affected_rows} rows)`);
}

async function getUserByDiscordId(discordId) {
    const gql = `
        query($discordId: String!) {
            users(where: {discord_id: {_eq: $discordId}}) {
                id
                discord_id
                username
                email
                user_roles {
                    role {
                        role_name
                        description
                    }
                }
            }
        }
    `;

    const data = await query(gql, { discordId });
    if (data.users.length === 0) {
        console.log(`❌ User with Discord ID "${discordId}" not found`);
        return;
    }

    const user = data.users[0];
    console.log('\n👤 User Details:\n');
    console.log('ID:', user.id);
    console.log('Discord ID:', user.discord_id);
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Roles:');
    user.user_roles.forEach(ur => {
        console.log(`  - ${ur.role.role_name}: ${ur.role.description}`);
    });
}

// ============================================
// CLI
// ============================================

const command = process.argv[2];
const args = process.argv.slice(3);

try {
    switch (command) {
        case 'list-users':
            await listUsers();
            break;

        case 'list-roles':
            await listRoles();
            break;

        case 'get-user':
            if (!args[0]) {
                console.log('Usage: node hasura-admin.js get-user <discord_id>');
                process.exit(1);
            }
            await getUserByDiscordId(args[0]);
            break;

        case 'add-role':
            if (!args[0] || !args[1]) {
                console.log('Usage: node hasura-admin.js add-role <user_id> <role_name>');
                process.exit(1);
            }
            await addUserRole(args[0], args[1]);
            break;

        case 'remove-role':
            if (!args[0] || !args[1]) {
                console.log('Usage: node hasura-admin.js remove-role <user_id> <role_name>');
                process.exit(1);
            }
            await removeUserRole(args[0], args[1]);
            break;

        default:
            console.log(`
Hasura Admin Tool

Commands:
  list-users              List all users
  list-roles              List all roles
  get-user <discord_id>   Get user by Discord ID
  add-role <user_id> <role_name>     Add role to user
  remove-role <user_id> <role_name>  Remove role from user

Examples:
  node scripts/hasura-admin.js list-users
  node scripts/hasura-admin.js get-user 403819286445162498
  node scripts/hasura-admin.js add-role <uuid> admin
            `);
    }
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
