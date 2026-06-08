#!/usr/bin/env python3
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import settings


def main():
    sql_path = Path(__file__).parent / "migration.sql"
    sql = sql_path.read_text()

    print("\n" + "=" * 60)
    print("Run this SQL in your Supabase SQL Editor to create tables:")
    print("=" * 60)
    print("1. Go to https://app.supabase.com/project/mttvgjsaquralustlusg/sql/new")
    print("2. Paste the SQL below")
    print("3. Click 'Run'")
    print("=" * 60)
    print(sql)
    print("=" * 60)


if __name__ == "__main__":
    main()
