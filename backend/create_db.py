import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="aditya221004",
        dbname="postgres"
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check if database exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'spk_ahpsaw'")
    exists = cur.fetchone()
    
    if not exists:
        cur.execute("CREATE DATABASE spk_ahpsaw")
        print("Database 'spk_ahpsaw' created successfully!")
    else:
        print("Database 'spk_ahpsaw' already exists.")
    
    cur.close()
    conn.close()
    print("PostgreSQL connection successful!")

except Exception as e:
    print(f"Error: {e}")
    print("\nPlease ensure PostgreSQL is running and the credentials are correct.")
    print("Default: user=postgres, password=postgres, port=5432")
    sys.exit(1)
