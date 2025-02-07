"""
InsightFlow AI — Sample data seeder.
Generates realistic analytics events for dashboard demonstration.
"""
import asyncio
import json
import random
from datetime import UTC, datetime, timedelta

import asyncpg

DATABASE_URL = "postgresql://insightflow:password@localhost:5432/insightflow"

PAGES = [
    "/",
    "/dashboard",
    "/pricing",
    "/features",
    "/about",
    "/blog",
    "/signup",
    "/login",
    "/settings",
    "/docs",
]

EVENTS = [
    "page_view",
    "button_click",
    "sign_up_clicked",
    "email_entered",
    "account_created",
    "feature_used",
    "upgrade_clicked",
    "plan_selected",
    "payment_completed",
    "logout",
]

BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"]
OS_LIST = ["Windows", "macOS", "Linux", "iOS", "Android"]


def random_user_id():
    return f"user-{random.randint(1000, 9999)}"


def random_session_id():
    return f"session-{random.randint(100000, 999999)}"


async def seed(conn: asyncpg.Connection) -> None:
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            distinct_id TEXT NOT NULL,
            event TEXT NOT NULL,
            properties JSONB DEFAULT '{}',
            session_id TEXT,
            page_url TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    await conn.execute("TRUNCATE TABLE events")

    now = datetime.now(UTC)
    records = []

    for _ in range(2000):
        user_id = random_user_id()
        session_id = random_session_id()
        event = random.choice(EVENTS)
        page = random.choice(PAGES)
        days_ago = random.uniform(0, 30)
        ts = now - timedelta(days=days_ago, hours=random.uniform(0, 23))

        props = {
            "$browser": random.choice(BROWSERS),
            "$os": random.choice(OS_LIST),
            "$pathname": page,
            "$session_id": session_id,
        }

        if event == "button_click":
            props["button_text"] = random.choice(
                ["Get Started", "Learn More", "Sign Up Free", "Upgrade"]
            )

        records.append((user_id, event, json.dumps(props), session_id, page, ts))

    await conn.executemany(
        """
        INSERT INTO events (distinct_id, event, properties, session_id, page_url, timestamp)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6)
        """,
        records,
    )

    print(f"Seeded {len(records)} events.")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await seed(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
