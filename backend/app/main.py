import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.api import auth, forecasts, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sales Forecast API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

TAILSCALE_IP = os.getenv("TAILSCALE_IP", "")

origins = ["http://localhost", "http://localhost:80"]
if TAILSCALE_IP:
    origins.append(f"http://{TAILSCALE_IP}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(forecasts.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}