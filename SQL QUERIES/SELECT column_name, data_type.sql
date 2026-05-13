SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'api_logs';

SELECT indexname
FROM pg_indexes
WHERE tablename = 'api_logs';

SELECT *
FROM information_schema.columns
WHERE table_name = 'api_logs';