import os

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import RSVP, admin, authentication, events, users
from . import models  # noqa: F401
from .database import Base, engine

load_dotenv()

app = FastAPI(title="Event Platform API")
ALLOWED_ORIGINS = [
    "https://eventsphere-hub.vercel.app",
    "https://eventsphere-i87lm1gsz-luckills-projects.vercel.app",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]


def _is_truthy_env(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

handler = Mangum(app)
if _is_truthy_env("ENABLE_SQLALCHEMY_CREATE_ALL"):
    Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(events.router)
app.include_router(authentication.router)
app.include_router(RSVP.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "Event Platform API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    if not _is_truthy_env("ENABLE_TEST_DB_ENDPOINT"):
        raise HTTPException(status_code=404, detail="Not found")

    result = db.execute(text("SELECT 1")).scalar_one_or_none()
    return {"database_response": result}
