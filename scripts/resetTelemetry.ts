import 'dotenv/config';
import { pool } from '../src/config/database';

async function resetTelemetry() {
    await pool.query('TRUNCATE api_logs, error_groups, alert_history RESTART IDENTITY');
    console.log('Telemetry, error groups, and alert history removed.');
    await pool.end();
}

void resetTelemetry().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
