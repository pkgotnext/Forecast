"""
Run this script to seed initial users:
  docker compose exec backend python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.forecast import Forecast 

Base.metadata.create_all(bind=engine)

USERS = [
    {
        "email": "admin@firma.pl",
        "full_name": "Jan Kowalski (Zarząd)",
        "password": "Admin1234!",
        "role": UserRole.MANAGEMENT,
    },
    {
        "email": "handlowiec1@firma.pl",
        "full_name": "Maciej Nowak",
        "password": "Sales1234!",
        "role": UserRole.SALES,
    },
    {
        "email": "handlowiec2@firma.pl",
        "full_name": "Piotr Wiśniewski",
        "password": "Sales1234!",
        "role": UserRole.SALES,
    },
    {
        "email": "handlowiec3@firma.pl",
        "full_name": "Piotr Kowalski",
        "password": "Sales1234!",
        "role": UserRole.SALES,
    },
    {
        "email": "handlowiec4@firma.pl",
        "full_name": "Kamil Dąbrowski",
        "password": "Sales1234!",
        "role": UserRole.SALES,
    },
]


def seed():
    db = SessionLocal()
    created = 0
    for u in USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            print(f"  ⏭  {u['email']} — already exists")
            continue
        user = User(
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
        )
        db.add(user)
        created += 1
        print(f"  ✅ {u['email']} ({u['role'].value}) — created")

    db.commit()
    db.close()
    print(f"\nDone. {created} user(s) created.")


if __name__ == "__main__":
    print("Seeding users...")
    seed()