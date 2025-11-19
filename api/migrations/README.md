# Database Migrations

This folder contains database migration scripts for the Gym Follow Up application.

## Migration System

Migrations are SQL scripts that can be run to update the database schema or migrate data.

## How to Run Migrations

### Option 1: Run a specific migration

```bash
# From the project root
docker exec -i gym-followup-db mysql -uroot -p<DB_ROOT_PASSWORD> gym_followup < api/migrations/001_refactor_api_structure.sql
```

### Option 2: Run all migrations

```bash
# Run all migrations in order
for file in api/migrations/*.sql; do
  docker exec -i gym-followup-db mysql -uroot -p<DB_ROOT_PASSWORD> gym_followup < "$file"
done
```

### Option 3: Using the migration runner script

```bash
# Run the migration runner
node api/migrations/run-migrations.js
```

## Migration Naming Convention

Migrations are named with a number prefix and descriptive name:
- `001_description.sql` - First migration
- `002_description.sql` - Second migration
- etc.

## Current Migrations

- `001_refactor_api_structure.sql` - Documents the API refactoring changes (no schema changes, only documentation)
- `002_progress_chart_feature.sql` - Documents the progress chart feature implementation (no schema changes, only documentation)

## Notes

- Always backup your database before running migrations
- Test migrations on a development environment first
- Migrations are idempotent when possible (can be run multiple times safely)

