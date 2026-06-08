#!/usr/bin/env python3
import httpx
import sys


SUPABASE_URL = "https://mttvgjsaquralustlusg.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dHZnanNhcXVyYWx1c3RsdXNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkwNzg0OCwiZXhwIjoyMDk2NDgzODQ4fQ.kVXogeSTPxIYWqkOEfT5hr3fRLdAeSQhDo857MRk8pw"


def migrate():
    sql_path = "backend/migration.sql"
    with open(sql_path) as f:
        sql = f.read()

    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/",
        headers=headers,
        json={"query": sql},
    )
    if resp.status_code == 200:
        print("Migration successful!")
        return True
    elif resp.status_code == 404:
        print("RPC endpoint not found. Run the SQL manually in Supabase SQL editor.")
        return run_sql_manually(sql)
    else:
        print(f"Error {resp.status_code}: {resp.text}")
        return run_sql_manually(sql)


def run_sql_manually(sql):
    print("\n" + "=" * 60)
    print("Please run this SQL in your Supabase SQL Editor:")
    print("=" * 60)
    print("1. Go to https://app.supabase.com/project/mttvgjsaquralustlusg/sql/new")
    print("2. Paste the SQL below")
    print("3. Click 'Run'")
    print("=" * 60)
    print(sql)
    print("=" * 60)
    return False


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
