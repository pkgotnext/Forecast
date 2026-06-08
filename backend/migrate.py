from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS wdrozenie VARCHAR(3) DEFAULT 'nie'"))
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS producent VARCHAR(255)"))
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS data_faktury VARCHAR(50)"))
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS data_platnosci VARCHAR(50)"))
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS architektura TEXT"))
    conn.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS recurring_group_id VARCHAR(36)"))

    existing = conn.execute(text("""
        SELECT DISTINCT user_id, client_name, COALESCE(project_name, '') AS project_name
        FROM forecasts
        WHERE notes LIKE '[Rekurencyjny%'
          AND recurring_group_id IS NULL
    """)).fetchall()

    for row in existing:
        new_uuid = str(__import__('uuid').uuid4())
        conn.execute(text("""
            UPDATE forecasts
            SET recurring_group_id = :uuid
            WHERE user_id = :uid
              AND client_name = :cname
              AND COALESCE(project_name, '') = :pname
              AND notes LIKE '[Rekurencyjny%'
              AND recurring_group_id IS NULL
        """), {"uuid": new_uuid, "uid": row.user_id, "cname": row.client_name, "pname": row.project_name})

    conn.commit()

backfilled = 0
with engine.connect() as conn:
    result = conn.execute(text("SELECT COUNT(*) FROM forecasts WHERE recurring_group_id IS NOT NULL")).fetchone()
    backfilled = result[0]

print(f"Gotowe - dodano recurring_group_id, backfill objął {backfilled} rekordów rekurencyjnych")