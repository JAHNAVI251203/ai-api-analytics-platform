import pool from "../config/database";

export class DemoDataService {
    static async generateDemoLogs() {
        try {
            const result = await pool.query(`
        SELECT COUNT(*) AS count
        FROM api_logs
        WHERE timestamp >= NOW() - INTERVAL '30 minutes'
      `);

            const recentLogs = Number(result.rows[0].count);

            if (recentLogs > 0) {
                console.log(
                    `Demo generator skipped (${recentLogs} recent logs found)`
                );
                return;
            }

            console.log("No recent traffic detected. Generating demo logs...");

            const endpoints = [
                "/api/users",
                "/api/orders",
                "/api/payments",
                "/api/products",
                "/api/auth/login",
                "/api/comments",
            ];

            const methods = ["GET", "POST", "PUT", "DELETE"];

            const totalLogs = Math.floor(Math.random() * 5) + 8; // 8-12 logs

            for (let i = 0; i < totalLogs; i++) {
                const endpoint =
                    endpoints[Math.floor(Math.random() * endpoints.length)];

                const method =
                    methods[Math.floor(Math.random() * methods.length)];

                //weighted status distribution
                const r = Math.random();

                let statusCode: number;

                if (r < 0.90)
                    statusCode = 200;
                else if (r < 0.95)
                    statusCode = 400;
                else if (r < 0.98)
                    statusCode = 404;
                else
                    statusCode = 500;

                //mostly fast responses
                let responseTime = Math.floor(Math.random() * 220) + 40;

                //occasionally generate a slow request
                if (Math.random() < 0.1) {
                    responseTime = Math.floor(Math.random() * 800) + 700;
                }

                const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(
                    Math.random() * 255
                )}.${Math.floor(Math.random() * 255)}.${Math.floor(
                    Math.random() * 255
                )}`;

                const userAgent = "Demo Traffic Generator";

                //spread timestamps over the last 30 minutes
                const minutesAgo = Math.floor(Math.random() * 30);

                await pool.query(
                    `INSERT INTO api_logs(
            endpoint,
            method,
            status_code,
            response_time,
            ip_address,
            user_agent,
            timestamp)
          VALUES(
            $1,$2,$3,$4,$5,$6, NOW() - ($7 * INTERVAL '1 minute')
          )
        `,
                    [
                        endpoint,
                        method,
                        statusCode,
                        responseTime,
                        ipAddress,
                        userAgent,
                        minutesAgo,
                    ]
                );
            }
            console.log(`Inserted ${totalLogs} demo logs.`);
        } catch (error) {
            console.error("Demo log generation failed:", error);
        }
    }
}