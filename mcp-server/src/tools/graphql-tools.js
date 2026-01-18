import { z } from 'zod';
import { generateTokenForUser } from '../auth/jwt.js';

const configSchema = z.object({
  endpoint: z.string().url(),
  headers: z.record(z.string()).default({}),
  allowMutations: z.boolean().default(false)
});

async function loadConfig() {
  const endpoint = process.env.ORBIOS_GRAPHQL_ENDPOINT || process.env.ENDPOINT;
  if (!endpoint) {
    throw new Error('Missing GraphQL endpoint. Set ORBIOS_GRAPHQL_ENDPOINT (or ENDPOINT).');
  }

  const headersRaw = process.env.ORBIOS_GRAPHQL_HEADERS || process.env.HEADERS;
  let headers = {};
  if (headersRaw && headersRaw.trim().length > 0) {
    try {
      headers = JSON.parse(headersRaw);
    } catch {
      throw new Error('Invalid ORBIOS_GRAPHQL_HEADERS (or HEADERS). Must be a JSON object string.');
    }
  }

  // Add JWT token if user is authenticated
  const userId = process.env.ORBIOS_USER_ID;
  if (userId) {
    try {
      const token = await generateTokenForUser(userId);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('[GraphQL] Failed to generate JWT token:', error.message);
      // Continue without JWT - will use public access
    }
  }

  const allowMutationsRaw = process.env.ORBIOS_GRAPHQL_ALLOW_MUTATIONS || process.env.ALLOW_MUTATIONS;
  const allowMutations = String(allowMutationsRaw || '').toLowerCase() === 'true';

  return configSchema.parse({ endpoint, headers, allowMutations });
}

async function postGraphql({ endpoint, headers, body }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from GraphQL endpoint. HTTP ${response.status}. Body: ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    throw new Error(`GraphQL request failed. HTTP ${response.status}. Response: ${JSON.stringify(json).slice(0, 1000)}`);
  }

  return json;
}

const introspectionQuery = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type {
            kind
            name
            ofType { kind name ofType { kind name ofType { kind name } } }
          }
          defaultValue
        }
        type {
          kind
          name
          ofType { kind name ofType { kind name ofType { kind name } } }
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        name
        description
        type {
          kind
          name
          ofType { kind name ofType { kind name ofType { kind name } } }
        }
        defaultValue
      }
      interfaces {
        kind
        name
        ofType { kind name }
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        kind
        name
        ofType { kind name }
      }
    }
    directives {
      name
      description
      locations
      args {
        name
        description
        type {
          kind
          name
          ofType { kind name ofType { kind name ofType { kind name } } }
        }
        defaultValue
      }
    }
  }
}`;

export async function graphqlIntrospectSchema() {
  const cfg = await loadConfig();
  const result = await postGraphql({
    endpoint: cfg.endpoint,
    headers: cfg.headers,
    body: { query: introspectionQuery }
  });

  return {
    success: true,
    schema: result
  };
}

const graphqlQuerySchema = z.object({
  query: z.string().min(1),
  variables: z.record(z.any()).optional()
});

export async function graphqlQuery(params) {
  const cfg = await loadConfig();
  const { query, variables } = graphqlQuerySchema.parse(params || {});

  const trimmed = query.trim().toLowerCase();
  const isMutation = trimmed.startsWith('mutation');

  if (isMutation && !cfg.allowMutations) {
    throw new Error('Mutations are disabled. Set ORBIOS_GRAPHQL_ALLOW_MUTATIONS=true to enable.');
  }

  const result = await postGraphql({
    endpoint: cfg.endpoint,
    headers: cfg.headers,
    body: { query, variables }
  });

  return {
    success: true,
    result
  };
}
