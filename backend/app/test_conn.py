import sys
import os
from sqlalchemy.sql import text

# Add the backend directory to sys.path to allow execution as a direct script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

def test_connection():
    print("Attempting to connect to PostgreSQL database...")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1;"))
            row = result.fetchone()
            if row and row[0] == 1:
                print("=========================================================")
                print("SUCCESS: Database connection established successfully!")
                print("=========================================================")
            else:
                print("FAILED: Connection opened, but test query returned incorrect result.")
    except Exception as e:
        print("=========================================================")
        print(f"FAILED: Connection error occurred:\n{e}")
        print("=========================================================")

if __name__ == "__main__":
    test_connection()
