"""
Router untuk import data alternatif dari file Excel (.xlsx), CSV, atau JSON.
"""

import csv
import json
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alternative, AlternativeScore, SubCriteria, Criteria, Project, User, UserRole
from app.auth import require_role

router = APIRouter(prefix="/api/projects/{project_id}/import", tags=["Import/Export"])


def _get_subcriteria_map(db: Session, project_id: int) -> dict:
    """Buat mapping nama sub-kriteria → id."""
    criteria_list = (
        db.query(Criteria)
        .filter(Criteria.project_id == project_id)
        .order_by(Criteria.display_order)
        .all()
    )
    sc_map = {}
    for c in criteria_list:
        subs = (
            db.query(SubCriteria)
            .filter(SubCriteria.criteria_id == c.id)
            .order_by(SubCriteria.display_order)
            .all()
        )
        for s in subs:
            # Normalize: lowercase dan strip untuk matching
            sc_map[s.name.strip().lower()] = s.id
    return sc_map


def _parse_csv(content: bytes, sc_map: dict) -> list[dict]:
    """Parse CSV file → list of {name, description, scores: {sub_id: value}}."""
    text = content.decode("utf-8-sig")  # Handle BOM
    reader = csv.DictReader(io.StringIO(text))

    results = []
    for row in reader:
        name = row.get("Alternatif (Ruas Jalan)") or row.get("Ruas Jalan") or row.get("Alternatif") or row.get("name") or row.get("Nama")
        if not name:
            # Try first column
            first_key = list(row.keys())[0] if row else None
            if first_key:
                name = row[first_key]
        if not name or not name.strip():
            continue

        scores = {}
        for col_name, value in row.items():
            col_lower = col_name.strip().lower()
            if col_lower in sc_map:
                try:
                    scores[sc_map[col_lower]] = float(value)
                except (ValueError, TypeError):
                    pass
        results.append({"name": name.strip(), "description": "", "scores": scores})

    return results


def _parse_xlsx(content: bytes, sc_map: dict) -> list[dict]:
    """Parse Excel .xlsx file → list of {name, description, scores}."""
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        return []

    headers = [str(h).strip() if h else "" for h in rows[0]]

    # Find name column
    name_col = None
    for i, h in enumerate(headers):
        h_lower = h.lower()
        if any(kw in h_lower for kw in ["alternatif", "ruas jalan", "nama", "name"]):
            name_col = i
            break
    if name_col is None:
        name_col = 0  # Fallback: first column

    # Map header columns to subcriteria IDs
    col_to_sub = {}
    for i, h in enumerate(headers):
        h_lower = h.strip().lower()
        if h_lower in sc_map:
            col_to_sub[i] = sc_map[h_lower]

    results = []
    for row in rows[1:]:
        if not row or not row[name_col]:
            continue
        name = str(row[name_col]).strip()
        if not name:
            continue

        scores = {}
        for col_idx, sub_id in col_to_sub.items():
            val = row[col_idx] if col_idx < len(row) else None
            if val is not None:
                try:
                    scores[sub_id] = float(val)
                except (ValueError, TypeError):
                    pass
        results.append({"name": name, "description": "", "scores": scores})

    wb.close()
    return results


def _parse_json(content: bytes, sc_map: dict) -> list[dict]:
    """Parse JSON file → list of {name, description, scores}."""
    data = json.loads(content.decode("utf-8-sig"))

    if not isinstance(data, list):
        data = [data]

    results = []
    for item in data:
        name = item.get("name") or item.get("nama") or item.get("alternatif")
        if not name:
            continue

        description = item.get("description") or item.get("deskripsi") or ""
        raw_scores = item.get("scores") or item.get("skor") or {}

        scores = {}
        for key, value in raw_scores.items():
            key_lower = key.strip().lower()
            if key_lower in sc_map:
                try:
                    scores[sc_map[key_lower]] = float(value)
                except (ValueError, TypeError):
                    pass

        results.append({"name": name.strip(), "description": description, "scores": scores})

    return results


@router.post("/")
async def import_alternatives(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """
    Import data alternatif dari file Excel (.xlsx), CSV (.csv), atau JSON (.json).

    Format file:
    - CSV/Excel: Header harus mengandung nama sub-kriteria yang sesuai.
      Kolom pertama atau kolom bernama 'Alternatif'/'Ruas Jalan' sebagai nama.
    - JSON: Array of objects [{name, scores: {sub_criteria_name: value}}]
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")

    # Determine file type
    filename = (file.filename or "").lower()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="File kosong")

    # Build subcriteria name → id mapping
    sc_map = _get_subcriteria_map(db, project_id)
    if not sc_map:
        raise HTTPException(status_code=400, detail="Belum ada sub-kriteria di project ini")

    # Parse based on file type
    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            parsed = _parse_xlsx(content, sc_map)
        elif filename.endswith(".csv"):
            parsed = _parse_csv(content, sc_map)
        elif filename.endswith(".json"):
            parsed = _parse_json(content, sc_map)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Format file tidak didukung: {filename}. Gunakan .xlsx, .csv, atau .json"
            )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="File JSON tidak valid")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {str(e)}")

    if not parsed:
        raise HTTPException(status_code=400, detail="Tidak ada data yang bisa di-parse dari file")

    # Insert to database
    added = 0
    updated = 0
    for item in parsed:
        # Check if alternative already exists
        existing = db.query(Alternative).filter(
            Alternative.project_id == project_id,
            Alternative.name == item["name"],
        ).first()

        if existing:
            # Update scores only
            alt = existing
            updated += 1
        else:
            alt = Alternative(
                project_id=project_id,
                name=item["name"],
                description=item.get("description", ""),
            )
            db.add(alt)
            db.flush()
            added += 1

        # Upsert scores
        for sub_id, score in item["scores"].items():
            existing_score = db.query(AlternativeScore).filter(
                AlternativeScore.alternative_id == alt.id,
                AlternativeScore.subcriteria_id == sub_id,
            ).first()
            if existing_score:
                existing_score.score = score
            else:
                db.add(AlternativeScore(
                    alternative_id=alt.id,
                    subcriteria_id=sub_id,
                    score=score,
                ))

    db.commit()

    return {
        "detail": f"Import berhasil! {added} alternatif baru ditambahkan, {updated} di-update.",
        "added": added,
        "updated": updated,
        "total_parsed": len(parsed),
        "subcriteria_matched": len(sc_map),
    }
