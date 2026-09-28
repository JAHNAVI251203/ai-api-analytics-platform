import assert from 'node:assert/strict';
import { pool } from '../config/database';
import { ensureSampleData } from '../services/SampleDataService';

async function testSampleData() {
    await ensureSampleData();
    const firstCount = Number((await pool.query(
        "SELECT COUNT(*) FROM api_logs WHERE data_source = 'sample'"
    )).rows[0].count);

    await ensureSampleData();
    const secondCount = Number((await pool.query(
        "SELECT COUNT(*) FROM api_logs WHERE data_source = 'sample'"
    )).rows[0].count);

    assert.ok(firstCount > 0, 'sample data should be created');
    assert.equal(secondCount, firstCount, 'sample data should not duplicate');
    console.log(`Sample data is idempotent (${secondCount} rows)`);
    await pool.end();
}

testSampleData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
