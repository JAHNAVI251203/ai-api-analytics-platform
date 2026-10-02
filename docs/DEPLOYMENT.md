# Deployment

Run the API and worker as separate services using the same `DATABASE_URL` and authenticated `REDIS_URL`. Deploy PostgreSQL and Redis on private networks; expose only the API and dashboard. Set `INGESTION_API_KEY`, `WEBHOOK_ALLOWED_HOSTS`, and optional AI provider keys through the platform secret manager.

Use the provided Compose stack locally. It runs frontend, API, worker, Demo API, PostgreSQL, and Redis. Database migrations run when API/worker start. Before moving to AWS, add managed PostgreSQL/Redis, private subnets/security groups, a load balancer for the API, and centralized logs; keep the worker independently scalable.
