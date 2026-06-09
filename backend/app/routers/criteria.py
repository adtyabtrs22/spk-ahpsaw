from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Criteria, SubCriteria, Project, User, UserRole
from app.schemas import (
    CriteriaCreate, CriteriaResponse, CriteriaUpdate,
    SubCriteriaCreate, SubCriteriaResponse, SubCriteriaUpdate,
)
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/projects/{project_id}/criteria", tags=["Criteria"])


@router.get("/", response_model=list[CriteriaResponse])
def list_criteria(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    criteria = (
        db.query(Criteria)
        .filter(Criteria.project_id == project_id)
        .order_by(Criteria.display_order)
        .all()
    )
    return criteria


@router.post("/", response_model=CriteriaResponse)
def create_criteria(
    project_id: int,
    payload: CriteriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    criteria = Criteria(
        project_id=project_id,
        name=payload.name,
        display_order=payload.display_order,
    )
    db.add(criteria)
    db.flush()

    for sc in payload.sub_criteria:
        sub = SubCriteria(
            criteria_id=criteria.id,
            name=sc.name,
            criteria_type=sc.criteria_type,
            display_order=sc.display_order,
        )
        db.add(sub)

    db.commit()
    db.refresh(criteria)
    return criteria


@router.delete("/{criteria_id}")
def delete_criteria(
    project_id: int,
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    criteria = db.query(Criteria).filter(
        Criteria.id == criteria_id, Criteria.project_id == project_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
    db.delete(criteria)
    db.commit()
    return {"detail": "Kriteria berhasil dihapus"}


@router.put("/{criteria_id}", response_model=CriteriaResponse)
def update_criteria(
    project_id: int,
    criteria_id: int,
    payload: CriteriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Update nama kriteria."""
    criteria = db.query(Criteria).filter(
        Criteria.id == criteria_id, Criteria.project_id == project_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
    criteria.name = payload.name
    db.commit()
    db.refresh(criteria)
    return criteria


# ─── Sub-Criteria ────────────────────────────────────────────────────────

@router.post("/{criteria_id}/subcriteria", response_model=SubCriteriaResponse)
def add_subcriteria(
    project_id: int,
    criteria_id: int,
    payload: SubCriteriaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    criteria = db.query(Criteria).filter(
        Criteria.id == criteria_id, Criteria.project_id == project_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")

    sub = SubCriteria(
        criteria_id=criteria_id,
        name=payload.name,
        criteria_type=payload.criteria_type,
        display_order=payload.display_order,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{criteria_id}/subcriteria/{sub_id}")
def delete_subcriteria(
    project_id: int,
    criteria_id: int,
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    sub = db.query(SubCriteria).filter(
        SubCriteria.id == sub_id, SubCriteria.criteria_id == criteria_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-kriteria tidak ditemukan")
    db.delete(sub)
    db.commit()
    return {"detail": "Sub-kriteria berhasil dihapus"}


@router.put("/{criteria_id}/subcriteria/{sub_id}", response_model=SubCriteriaResponse)
def update_subcriteria(
    project_id: int,
    criteria_id: int,
    sub_id: int,
    payload: SubCriteriaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Update nama sub-kriteria."""
    sub = db.query(SubCriteria).filter(
        SubCriteria.id == sub_id, SubCriteria.criteria_id == criteria_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-kriteria tidak ditemukan")
    sub.name = payload.name
    db.commit()
    db.refresh(sub)
    return sub
