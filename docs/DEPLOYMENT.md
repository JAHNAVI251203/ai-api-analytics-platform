# Deployment

Run the API and worker as separate services using the same `DATABASE_URL` and authenticated `REDIS_URL`. Deploy PostgreSQL and Redis on private networks; expose only the API and dashboard. Set `INGESTION_API_KEY`, `WEBHOOK_ALLOWED_HOSTS`, and optional AI provider keys through the platform secret manager.

For Railway, deploy the Dockerfile as the API service with `npm start`, then create a second service from the same repository/image with the start command `npm run worker`. Both services need the same database and Redis variables. The current Vercel dashboard uses `REACT_APP_API_URL=https://ai-api-analytics-platform-production.up.railway.app/api` and `REACT_APP_SOCKET_URL=https://ai-api-analytics-platform-production.up.railway.app`. Redeploy Vercel after changing either value because Create React App embeds build-time variables.

Use the provided Compose stack locally. It runs frontend, API, worker, PostgreSQL, and Redis. Database migrations run when API/worker start.
