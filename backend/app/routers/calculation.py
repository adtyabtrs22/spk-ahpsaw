from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Project, Criteria, SubCriteria, Alternative, AlternativeScore,
    PairwiseCriteria, PairwiseSubCriteria, CalculationResult,
    ConsistencyLog, User, UserRole,
)
from app.auth import get_current_user, require_role
from app.services.ahp_service import calculate_ahp_weights, calculate_global_weights
from app.services.saw_service import calculate_saw_ranking

router = APIRouter(prefix="/api/projects/{project_id}/calculate", tags=["Calculation"])


@router.post("/")
def run_calculation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """
    Menjalankan perhitungan AHP-SAW lengkap:
    1. Hitung bobot kriteria (AHP)
    2. Hitung bobot sub-kriteria per kriteria (AHP)
    3. Hitung bobot global
    4. Normalisasi SAW
    5. Hitung nilai preferensi & ranking
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    # Ambil semua data
    criteria_list = (
        db.query(Criteria)
        .filter(Criteria.project_id == project_id)
        .order_by(Criteria.display_order)
        .all()
    )
    if not criteria_list:
        raise HTTPException(status_code=400, detail="Belum ada kriteria. Tambahkan kriteria terlebih dahulu.")

    # ─── Step 1: AHP Kriteria ────────────────────────────────────────────
    criteria_ids = [c.id for c in criteria_list]
    pw_criteria = db.query(PairwiseCriteria).filter(
        PairwiseCriteria.project_id == project_id
    ).all()

    if not pw_criteria:
        raise HTTPException(status_code=400, detail="Belum ada matriks perbandingan kriteria. Isi matriks terlebih dahulu.")

    criteria_pw_data = [(pw.criteria_i, pw.criteria_j, pw.value) for pw in pw_criteria]
    ahp_criteria = calculate_ahp_weights(criteria_ids, criteria_pw_data)

    # Update bobot kriteria
    for c in criteria_list:
        c.weight = ahp_criteria["weights"].get(c.id, 0)

    # Log konsistensi kriteria
    db.query(ConsistencyLog).filter(
        ConsistencyLog.project_id == project_id,
        ConsistencyLog.matrix_type == "criteria",
    ).delete()
    db.add(ConsistencyLog(
        project_id=project_id,
        matrix_type="criteria",
        lambda_max=ahp_criteria["consistency"]["lambda_max"],
        ci=ahp_criteria["consistency"]["ci"],
        ri=ahp_criteria["consistency"]["ri"],
        cr=ahp_criteria["consistency"]["cr"],
        is_consistent=ahp_criteria["consistency"]["is_consistent"],
    ))

    # ─── Step 2: AHP Sub-Kriteria ────────────────────────────────────────
    subcriteria_weights_by_criteria = {}
    consistency_results = {
        "criteria": ahp_criteria["consistency"],
    }

    all_subcriteria = []
    for c in criteria_list:
        subs = (
            db.query(SubCriteria)
            .filter(SubCriteria.criteria_id == c.id)
            .order_by(SubCriteria.display_order)
            .all()
        )
        if not subs:
            continue

        sub_ids = [s.id for s in subs]
        pw_sub = db.query(PairwiseSubCriteria).filter(
            PairwiseSubCriteria.criteria_id == c.id
        ).all()

        if pw_sub:
            sub_pw_data = [(pw.subcriteria_i, pw.subcriteria_j, pw.value) for pw in pw_sub]
            ahp_sub = calculate_ahp_weights(sub_ids, sub_pw_data)

            subcriteria_weights_by_criteria[c.id] = ahp_sub["weights"]
            consistency_results[f"subcriteria_{c.id}"] = ahp_sub["consistency"]

            # Update bobot lokal & global
            crit_weight = c.weight or 0
            for s in subs:
                local_w = ahp_sub["weights"].get(s.id, 0)
                s.weight_local = local_w
                s.weight_global = round(crit_weight * local_w, 10)

            # Log konsistensi
            matrix_type = f"subcriteria_{c.id}"
            db.query(ConsistencyLog).filter(
                ConsistencyLog.project_id == project_id,
                ConsistencyLog.matrix_type == matrix_type,
            ).delete()
            db.add(ConsistencyLog(
                project_id=project_id,
                matrix_type=matrix_type,
                lambda_max=ahp_sub["consistency"]["lambda_max"],
                ci=ahp_sub["consistency"]["ci"],
                ri=ahp_sub["consistency"]["ri"],
                cr=ahp_sub["consistency"]["cr"],
                is_consistent=ahp_sub["consistency"]["is_consistent"],
            ))

        all_subcriteria.extend(subs)

    db.flush()

    # ─── Step 3: Bobot Global ────────────────────────────────────────────
    global_weights = calculate_global_weights(
        ahp_criteria["weights"],
        subcriteria_weights_by_criteria,
    )

    # ─── Step 4 & 5: SAW ─────────────────────────────────────────────────
    alternatives = db.query(Alternative).filter(
        Alternative.project_id == project_id
    ).all()

    if not alternatives:
        raise HTTPException(status_code=400, detail="Belum ada alternatif. Tambahkan alternatif terlebih dahulu.")

    alt_ids = [a.id for a in alternatives]
    sub_ids_ordered = [s.id for s in all_subcriteria]
    criteria_types = [s.criteria_type for s in all_subcriteria]

    # Ambil semua skor
    scores = db.query(AlternativeScore).filter(
        AlternativeScore.alternative_id.in_(alt_ids),
        AlternativeScore.subcriteria_id.in_(sub_ids_ordered),
    ).all()
    scores_data = {(s.alternative_id, s.subcriteria_id): s.score for s in scores}

    if not scores_data:
        raise HTTPException(status_code=400, detail="Belum ada skor alternatif. Isi skor terlebih dahulu.")

    saw_result = calculate_saw_ranking(
        alt_ids, sub_ids_ordered, scores_data,
        criteria_types, global_weights,
    )

    # ─── Simpan Hasil ────────────────────────────────────────────────────
    db.query(CalculationResult).filter(
        CalculationResult.project_id == project_id
    ).delete()

    alt_name_map = {a.id: a.name for a in alternatives}
    rankings_response = []

    for ranking in saw_result["rankings"]:
        calc_result = CalculationResult(
            project_id=project_id,
            alternative_id=ranking["alternative_id"],
            normalized_scores=ranking["normalized_scores"],
            weighted_scores=ranking["weighted_scores"],
            preference_value=ranking["preference_value"],
            rank=ranking["rank"],
        )
        db.add(calc_result)

        rankings_response.append({
            "alternative_id": ranking["alternative_id"],
            "alternative_name": alt_name_map.get(ranking["alternative_id"], ""),
            "normalized_scores": ranking["normalized_scores"],
            "weighted_scores": ranking["weighted_scores"],
            "preference_value": ranking["preference_value"],
            "rank": ranking["rank"],
        })

    db.commit()

    # ─── Build Response ──────────────────────────────────────────────────
    criteria_weights_resp = {str(c.id): {"name": c.name, "weight": c.weight} for c in criteria_list}
    subcriteria_weights_resp = {}
    for s in all_subcriteria:
        subcriteria_weights_resp[str(s.id)] = {
            "name": s.name,
            "criteria_id": s.criteria_id,
            "weight_local": s.weight_local,
            "weight_global": s.weight_global,
            "criteria_type": s.criteria_type,
        }

    return {
        "project_id": project_id,
        "criteria_weights": criteria_weights_resp,
        "subcriteria_weights": subcriteria_weights_resp,
        "consistency_results": consistency_results,
        "decision_matrix": saw_result["decision_matrix"],
        "normalized_matrix": saw_result["normalized_matrix"],
        "rankings": rankings_response,
        "calculated_at": datetime.utcnow().isoformat(),
    }


@router.get("/results")
def get_results(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ambil hasil perhitungan terakhir."""
    results = (
        db.query(CalculationResult)
        .filter(CalculationResult.project_id == project_id)
        .order_by(CalculationResult.rank)
        .all()
    )
    if not results:
        raise HTTPException(status_code=404, detail="Belum ada hasil perhitungan")

    # Ambil data kriteria & bobot
    criteria_list = db.query(Criteria).filter(Criteria.project_id == project_id).all()
    all_subs = []
    for c in criteria_list:
        subs = db.query(SubCriteria).filter(SubCriteria.criteria_id == c.id).all()
        all_subs.extend(subs)

    consistency_logs = db.query(ConsistencyLog).filter(
        ConsistencyLog.project_id == project_id
    ).all()

    alt_map = {a.id: a.name for a in db.query(Alternative).filter(
        Alternative.project_id == project_id).all()}

    return {
        "project_id": project_id,
        "criteria_weights": {str(c.id): {"name": c.name, "weight": c.weight} for c in criteria_list},
        "subcriteria_weights": {
            str(s.id): {
                "name": s.name,
                "criteria_id": s.criteria_id,
                "weight_local": s.weight_local,
                "weight_global": s.weight_global,
                "criteria_type": s.criteria_type,
            } for s in all_subs
        },
        "consistency_results": {
            log.matrix_type: {
                "lambda_max": log.lambda_max,
                "ci": log.ci,
                "ri": log.ri,
                "cr": log.cr,
                "is_consistent": log.is_consistent,
            } for log in consistency_logs
        },
        "rankings": [
            {
                "alternative_id": r.alternative_id,
                "alternative_name": alt_map.get(r.alternative_id, ""),
                "normalized_scores": r.normalized_scores,
                "weighted_scores": r.weighted_scores,
                "preference_value": r.preference_value,
                "rank": r.rank,
            } for r in results
        ],
        "calculated_at": results[0].calculated_at.isoformat() if results else None,
    }
