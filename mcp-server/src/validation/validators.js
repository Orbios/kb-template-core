import { z } from 'zod';

/**
 * Validate mission ID format (kebab-case)
 * @param {string} id - Mission ID to validate
 * @throws {Error} If ID is invalid
 */
export function validateMissionId(id) {
    if (!/^[a-z0-9-]+$/.test(id)) {
        throw new Error(
            `Invalid mission ID: "${id}". Must be kebab-case (lowercase letters, numbers, and hyphens only).`
        );
    }

    if (id.startsWith('-') || id.endsWith('-')) {
        throw new Error(
            `Invalid mission ID: "${id}". Cannot start or end with a hyphen.`
        );
    }

    if (id.includes('--')) {
        throw new Error(
            `Invalid mission ID: "${id}". Cannot contain consecutive hyphens.`
        );
    }
}

/**
 * Validate mission status
 * @param {string} status - Status to validate
 * @throws {Error} If status is invalid
 */
export function validateMissionStatus(status) {
    const validStatuses = ['active', 'completed', 'archived'];

    if (!validStatuses.includes(status)) {
        throw new Error(
            `Invalid mission status: "${status}". Must be one of: ${validStatuses.join(', ')}`
        );
    }
}

/**
 * Mission creation schema
 */
export const missionCreateSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(['active', 'completed', 'archived']).default('active'),
    participants: z.array(z.string()).optional().default([]),
    agent: z.object({
        model: z.string(),
        alias: z.string()
    }).optional()
});

/**
 * Mission update schema
 */
export const missionUpdateSchema = z.object({
    id: z.string().min(1),
    updates: z.object({
        title: z.string().optional(),
        status: z.enum(['active', 'completed', 'archived']).optional(),
        participants: z.array(z.string()).optional(),
        agent: z.object({
            model: z.string(),
            alias: z.string()
        }).optional()
    })
});

/**
 * Mission list filter schema
 */
export const missionListFilterSchema = z.object({
    status: z.enum(['active', 'completed', 'archived']).optional(),
    participant: z.string().optional()
}).optional();

/**
 * Validate mission creation input
 * @param {Object} input - Input to validate
 * @returns {Object} Validated input
 */
export function validateMissionCreate(input) {
    const validated = missionCreateSchema.parse(input);
    validateMissionId(validated.id);
    return validated;
}

/**
 * Validate mission update input
 * @param {Object} input - Input to validate
 * @returns {Object} Validated input
 */
export function validateMissionUpdate(input) {
    const validated = missionUpdateSchema.parse(input);
    validateMissionId(validated.id);

    if (validated.updates.status) {
        validateMissionStatus(validated.updates.status);
    }

    return validated;
}
