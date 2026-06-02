from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alternative, AlternativeScore, SubCriteria, Criteria, Project, User, UserRole
from app.schemas import AlternativeCreate, AlternativeScoreInput, AlternativeResponse
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/projects/{project_id}/alternatives", tags=["Alternatives"])


@router.get("/", response_model=list[AlternativeResponse])
def list_alternatives(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alts = (
        db.query(Alternative)
        .filter(Alternative.project_id == project_id)
        .all()
    )
    result = []
    for alt in alts:
        scores = db.query(AlternativeScore).filter(
            AlternativeScore.alternative_id == alt.id
        ).all()
        score_dict = {s.subcriteria_id: s.score for s in scores}
        result.append(AlternativeResponse(
            id=alt.id,
            project_id=alt.project_id,
            name=alt.name,
            description=alt.description,
            scores=score_dict,
        ))
    return result


@router.post("/", response_model=AlternativeResponse)
def create_alternative(
    project_id: int,
    payload: AlternativeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    alt = Alternative(
        project_id=project_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(alt)
    db.commit()
    db.refresh(alt)
    return AlternativeResponse(
        id=alt.id,
        project_id=alt.project_id,
        name=alt.name,
        description=alt.description,
        scores={},
    )


@router.put("/{alt_id}", response_model=AlternativeResponse)
def update_alternative(
    project_id: int,
    alt_id: int,
    payload: AlternativeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    alt = db.query(Alternative).filter(
        Alternative.id == alt_id, Alternative.project_id == project_id
    ).first()
    if not alt:
        raise HTTPException(status_code=404, detail="Alternatif tidak ditemukan")
    alt.name = payload.name
    alt.description = payload.description
    db.commit()
    db.refresh(alt)
    scores = db.query(AlternativeScore).filter(AlternativeScore.alternative_id == alt.id).all()
    return AlternativeResponse(
        id=alt.id, project_id=alt.project_id, name=alt.name,
        description=alt.description,
        scores={s.subcriteria_id: s.score for s in scores},
    )


@router.delete("/{alt_id}")
def delete_alternative(
    project_id: int,
    alt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    alt = db.query(Alternative).filter(
        Alternative.id == alt_id, Alternative.project_id == project_id
    ).first()
    if not alt:
        raise HTTPException(status_code=404, detail="Alternatif tidak ditemukan")
    db.delete(alt)
    db.commit()
    return {"detail": "Alternatif berhasil dihapus"}


# ─── Scores ──────────────────────────────────────────────────────────────

@router.post("/scores")
def save_scores(
    project_id: int,
    payload: list[AlternativeScoreInput],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Simpan/update skor semua alternatif sekaligus."""
    for item in payload:
        alt = db.query(Alternative).filter(
            Alternative.id == item.alternative_id,
            Alternative.project_id == project_id,
        ).first()
        if not alt:
            continue

        for score_entry in item.scores:
            existing = db.query(AlternativeScore).filter(
                AlternativeScore.alternative_id == item.alternative_id,
                AlternativeScore.subcriteria_id == score_entry.subcriteria_id,
            ).first()
            if existing:
                existing.score = score_entry.score
            else:
                new_score = AlternativeScore(
                    alternative_id=item.alternative_id,
                    subcriteria_id=score_entry.subcriteria_id,
                    score=score_entry.score,
                )
                db.add(new_score)

    db.commit()
    return {"detail": "Skor berhasil disimpan"}
