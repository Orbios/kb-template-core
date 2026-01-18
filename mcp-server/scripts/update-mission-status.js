
import { missionsUpdate } from '../src/tools/missions.js';

async function updateStatus(id, newStatus) {
    try {
        console.log(`Updating ${id} to ${newStatus}...`);
        await missionsUpdate({ id, updates: { status: newStatus } });
        console.log('Success.');
    } catch (e) {
        console.error(`Failed to update ${id}:`, e.message);
    }
}

async function run() {
    const missionsToComplete = [
        'hiring-market-25',
        'market-conext-25',
        'marketing-aus-outreach-launch',
        'marketing-review-team-fusion',
        'ops-core-cluster-lead-shift',
        'ops-core-team-retro-week',
        'orbios-brand-design-v1',
        'orbios-life-erik-sytnyk-25',
        'orbios-ops',
        'team-fusion-marketing',
        'team-fusion-ops',
        'yacht-booking-website'
    ];

    for (const id of missionsToComplete) {
        await updateStatus(id, 'completed');
    }
}

run();
