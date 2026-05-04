from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from app.dependencies import get_current_user, require_role
from app.models.User import User, UserRole
from app.services.organizer_request_service import (
    create_request,
    get_pending_request,
)

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


def _serialize_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "cognito_sub": user.cognito_sub,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }
@router.get("/me")
def get_profile(user: User = Depends(get_current_user)):
    return _serialize_user(user)


@router.patch("/me")
def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    next_name = payload.name.strip()
    if not next_name:
        raise HTTPException(status_code=400, detail="name cannot be blank")

    if user.name != next_name:
        user.name = next_name
        db.commit()
        db.refresh(user)

    return _serialize_user(user)


@router.get("/", dependencies=[Depends(require_role(UserRole.admin))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_serialize_user(user) for user in users]


@router.post("/me/request-organizer")
def request_organizer_upgrade(
    user: User = Depends(require_role(UserRole.attendee)),
    db: Session = Depends(get_db)
):
    existing = get_pending_request(db, user.id)
    if existing:
        raise HTTPException(400, "Request already pending")

    create_request(db, user.id)

    return {"message": "Organizer request submitted"}
