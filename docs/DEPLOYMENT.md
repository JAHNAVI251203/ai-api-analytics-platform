# Deployment

Run the API and worker as separate services using the same `DATABASE_URL` and authenticated `REDIS_URL`. Deploy PostgreSQL and Redis on private networks; expose only the API and dashboard. Set `INGESTION_API_KEY`, `WEBHOOK_ALLOWED_HOSTS`, and optional AI provider keys through the platform secret manager.

For Railway, deploy the Dockerfile as the API service with `npm start`, then create a second service from the same repository/image with the start command `npm run worker`. Both services need the same database and Redis variables. The dashboard's Vercel `REACT_APP_API_URL` must be the Railway origin followed by `/api`; `REACT_APP_SOCKET_URL` remains the Railway origin. Redeploy Vercel after changing either value because Create React App embeds build-time variables.

Use the provided Compose stack locally. It runs frontend, API, worker, PostgreSQL, and Redis. Database migrations run when API/worker start. Before moving to AWS, add managed PostgreSQL/Redis, private subnets/security groups, a load balancer for the API, and centralized logs; keep the worker independently scalable.
