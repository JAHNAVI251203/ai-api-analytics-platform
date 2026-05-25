/*import 'dotenv/config';
import { pool } from '../src/config/database';

async function seedData() {
    const endpoints = ['/api/users', '/api/posts', '/api/comments', '/api/auth/login'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statusCodes = [200, 201, 400, 401, 404, 500];
    
    console.log('Seeding 1000 log entries...');
    
    for (let i = 0; i < 1000; i++) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
        const responseTime = Math.floor(Math.random() * 500) + 10;
        
        await pool.query(
            `INSERT INTO api_logs (endpoint, method, status_code, response_time)
             VALUES ($1, $2, $3, $4)`,
            [endpoint, method, statusCode, responseTime]
        );
        
        if (i % 100 === 0) console.log(`Inserted ${i} records...`);
    }
    
    console.log('✅ Seeding complete!');
    process.exit(0);
}

seedData();*/

import 'dotenv/config';
import { pool } from '../src/config/database';

async function seedData() {
  try {
    const endpoints = ['/api/users', '/api/posts', '/api/comments', '/api/auth/login'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statusCodes = [200, 201, 400, 401, 404, 500];

    for (let i = 0; i < 1000; i++) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)]!;
        const responseTime = Math.floor(Math.random() * 500) + 10;

        await pool.query(
          `INSERT INTO api_logs (endpoint, method, status_code, response_time)
          VALUES ($1, $2, $3, $4)`,
          [endpoint, method, statusCode, responseTime]
        );

        //insert grouped errors
        if (statusCode >= 400) {
          const errorHash = `${endpoint}-${method}-${statusCode}`;

          const existingError = await pool.query(
            `SELECT * FROM error_groups
             WHERE error_hash = $1`,
            [errorHash]
          );

          //if error already exists, update the count
          if (existingError.rows.length > 0) {
            await pool.query(
              `UPDATE error_groups
               SET occurrence_count = occurrence_count + 1,
                   last_seen = NOW()
               WHERE error_hash = $1`,
              [errorHash]
            );
          } else {
            //create new grouped error
            await pool.query(
              `INSERT INTO error_groups (
                error_hash,
                error_message,
                endpoint,
                method,
                first_seen,
                last_seen,
                occurrence_count
              )
              VALUES
              ($1, $2, $3, $4, NOW(), NOW(), $5)`,
              [
                errorHash,
                `HTTP ${statusCode} error on ${endpoint}`,
                endpoint,
                method,
                1
              ]
            );
          }
        }
      } catch (error) {
        //prevent single insert failure from crashing whole script
        console.error('Error inserting record:', error);
      }
    }
    process.exit(0);
  } catch (error) {
    //prevent app crash
    console.error('Seed script failed:', error);
    process.exit(1);
  }
}

seedData();