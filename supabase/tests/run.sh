#!/bin/bash
set -e
export PGPORT=5433 PGHOST=/tmp PGUSER=postgres
dropdb --if-exists artes_test
createdb artes_test
for f in /tmp/harness/00_supabase_shim.sql /tmp/harness/2026*.sql; do
  psql -d artes_test -X -q -v ON_ERROR_STOP=1 -f "$f"
done
psql -d artes_test -X -v ON_ERROR_STOP=1 -f /tmp/harness/test_rls.sql
