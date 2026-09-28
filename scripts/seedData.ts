import 'dotenv/config';
import { pool } from '../src/config/database';
import { ensureSampleData } from '../src/services/SampleDataService';

async function seedData() {
    try {
        await ensureSampleData();
    } catch (error) {
        console.error('Sample data seed failed:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedData();
