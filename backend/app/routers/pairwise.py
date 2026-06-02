from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Criteria, SubCriteria, PairwiseCriteria, PairwiseSubCriteria,
    Project, User, UserRole,
)
from app.schemas import PairwiseInput, ConsistencyResult
from app.auth import get_current_user, require_role
from app.services.ahp_service import calculate_ahp_weights

router = APIRouter(prefix="/api/projects/{project_id}/pairwise", tags=["Pairwise Comparison"])


# ─── Pairwise Criteria ──────────────────────────────────────────────────

@router.get("/criteria")
def get_pairwise_criteria(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ambil matriks perbandingan berpasangan antar kriteria."""
    criteria = (
        db.query(Criteria)
        .filter(Criteria.project_id == project_id)
        .order_by(Criteria.display_order)
        .all()
    )
    entries = db.query(PairwiseCriteria).filter(
        PairwiseCriteria.project_id == project_id
    ).all()

    return {
        "criteria": [{"id": c.id, "name": c.name} for c in criteria],
        "entries": [
            {"row_id": e.criteria_i, "col_id": e.criteria_j, "value": e.value}
            for e in entries
        ],
    }


@router.post("/criteria", response_model=ConsistencyResult)
def save_pairwise_criteria(
    project_id: int,
    payload: PairwiseInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Simpan matriks perbandingan berpasangan kriteria dan hitung bobot AHP."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    # Hapus entri lama
    db.query(PairwiseCriteria).filter(
        PairwiseCriteria.project_id == project_id
    ).delete()

    # Simpan entri baru
    for entry in payload.entries:
        pw = PairwiseCriteria(
            project_id=project_id,
            criteria_i=entry.row_id,
            criteria_j=entry.col_id,
            value=entry.value,
        )
        db.add(pw)

    # Hitung AHP
    criteria = (
        db.query(Criteria)
        .filter(Criteria.project_id == project_id)
        .order_by(Criteria.display_order)
        .all()
    )
    item_ids = [c.id for c in criteria]
    pairwise_data = [(e.row_id, e.col_id, e.value) for e in payload.entries]
    result = calculate_ahp_weights(item_ids, pairwise_data)

    # Update bobot kriteria
    for c in criteria:
        c.weight = result["weights"].get(c.id, 0)

    db.commit()

    return ConsistencyResult(
        lambda_max=result["consistency"]["lambda_max"],
        ci=result["consistency"]["ci"],
        ri=result["consistency"]["ri"],
        cr=result["consistency"]["cr"],
        is_consistent=result["consistency"]["is_consistent"],
        weights={str(k): v for k, v in result["weights"].items()},
    )


# ─── Pairwise Sub-Criteria ──────────────────────────────────────────────

@router.get("/subcriteria/{criteria_id}")
def get_pairwise_subcriteria(
    project_id: int,
    criteria_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ambil matriks perbandingan berpasangan antar sub-kriteria."""
    subs = (
        db.query(SubCriteria)
        .filter(SubCriteria.criteria_id == criteria_id)
        .order_by(SubCriteria.display_order)
        .all()
    )
    entries = db.query(PairwiseSubCriteria).filter(
        PairwiseSubCriteria.criteria_id == criteria_id
    ).all()

    return {
        "criteria_id": criteria_id,
        "subcriteria": [{"id": s.id, "name": s.name} for s in subs],
        "entries": [
            {"row_id": e.subcriteria_i, "col_id": e.subcriteria_j, "value": e.value}
            for e in entries
        ],
    }


@router.post("/subcriteria/{criteria_id}", response_model=ConsistencyResult)
def save_pairwise_subcriteria(
    project_id: int,
    criteria_id: int,
    payload: PairwiseInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Simpan matriks perbandingan sub-kriteria dan hitung bobot lokal AHP."""
    criteria = db.query(Criteria).filter(
        Criteria.id == criteria_id, Criteria.project_id == project_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")

    # Hapus entri lama
    db.query(PairwiseSubCriteria).filter(
        PairwiseSubCriteria.criteria_id == criteria_id
    ).delete()

    # Simpan entri baru
    for entry in payload.entries:
        pw = PairwiseSubCriteria(
            criteria_id=criteria_id,
            subcriteria_i=entry.row_id,
            subcriteria_j=entry.col_id,
            value=entry.value,
        )
        db.add(pw)

    # Hitung AHP
    subs = (
        db.query(SubCriteria)
        .filter(SubCriteria.criteria_id == criteria_id)
        .order_by(SubCriteria.display_order)
        .all()
    )
    item_ids = [s.id for s in subs]
    pairwise_data = [(e.row_id, e.col_id, e.value) for e in payload.entries]
    result = calculate_ahp_weights(item_ids, pairwise_data)

    # Update bobot lokal sub-kriteria
    criteria_weight = criteria.weight or 0
    for s in subs:
        local_w = result["weights"].get(s.id, 0)
        s.weight_local = local_w
        s.weight_global = round(criteria_weight * local_w, 10)

    db.commit()

    return ConsistencyResult(
        lambda_max=result["consistency"]["lambda_max"],
        ci=result["consistency"]["ci"],
        ri=result["consistency"]["ri"],
        cr=result["consistency"]["cr"],
        is_consistent=result["consistency"]["is_consistent"],
        weights={str(k): v for k, v in result["weights"].items()},
    )
