"""
Script migrasi untuk menambah 5 alternatif baru ke database yang sudah ada.
Juga me-rename 'Jalan Prapatan' → 'Jalan Projakal' jika ditemukan.

Jalankan dari root project:
    python -m scripts.add_new_alternatives
atau dari folder backend:
    cd backend && python -c "import sys; sys.path.insert(0,'.'); exec(open('../scripts/add_new_alternatives.py').read())"
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal
from app.models import Alternative, AlternativeScore, SubCriteria, Project


def run_migration():
    db = SessionLocal()

    # Cari project pertama
    project = db.query(Project).first()
    if not project:
        print("❌ Tidak ada project di database.")
        db.close()
        return

    print(f"📦 Project: {project.name} (ID: {project.id})")

    # Rename Prapatan → Projakal
    prapatan = db.query(Alternative).filter(
        Alternative.project_id == project.id,
        Alternative.name == "Jalan Prapatan"
    ).first()
    if prapatan:
        prapatan.name = "Jalan Projakal"
        print("✏️  Renamed 'Jalan Prapatan' → 'Jalan Projakal'")

    # Ambil semua sub-kriteria berurutan
    all_subs = (
        db.query(SubCriteria)
        .join(SubCriteria.criteria)
        .filter(SubCriteria.criteria.has(project_id=project.id))
        .order_by(SubCriteria.criteria_id, SubCriteria.display_order)
        .all()
    )

    if len(all_subs) != 12:
        print(f"⚠️  Jumlah sub-kriteria: {len(all_subs)} (expected 12)")
        db.close()
        return

    sub_ids = [s.id for s in all_subs]
    print(f"📋 Sub-kriteria: {[s.name for s in all_subs]}")

    # Data alternatif baru
    new_alternatives = [
        {
            "name": "Jalan Syarifuddin Yoes",
            "description": "Jalan penghubung kawasan pemerintahan",
            "scores": [5, 5, 6, 4, 6, 5, 7, 8, 2, 6, 6, 7],
        },
        {
            "name": "Jalan Ruhui Rahayu",
            "description": "Jalan kawasan perumahan dan pemukiman",
            "scores": [4, 4, 5, 3, 5, 4, 6, 8, 1, 7, 7, 6],
        },
        {
            "name": "Jalan Mulawarman",
            "description": "Jalan penghubung kawasan industri",
            "scores": [6, 5, 5, 4, 7, 8, 8, 9, 3, 5, 5, 8],
        },
        {
            "name": "Jalan Ahmad Yani",
            "description": "Jalan utama penghubung pusat kota",
            "scores": [4, 3, 6, 3, 6, 6, 9, 9, 1, 6, 6, 9],
        },
        {
            "name": "Jalan Letjen Suprapto",
            "description": "Jalan penghubung kawasan perkantoran dan perdagangan",
            "scores": [5, 4, 4, 4, 6, 7, 8, 9, 1, 5, 6, 8],
        },
    ]

    added = 0
    for alt_data in new_alternatives:
        # Cek apakah sudah ada
        existing = db.query(Alternative).filter(
            Alternative.project_id == project.id,
            Alternative.name == alt_data["name"]
        ).first()

        if existing:
            print(f"⏭️  '{alt_data['name']}' sudah ada, skip.")
            continue

        alt = Alternative(
            project_id=project.id,
            name=alt_data["name"],
            description=alt_data["description"],
        )
        db.add(alt)
        db.flush()

        for i, score in enumerate(alt_data["scores"]):
            db.add(AlternativeScore(
                alternative_id=alt.id,
                subcriteria_id=sub_ids[i],
                score=score,
            ))

        print(f"✅ Ditambahkan: {alt_data['name']}")
        added += 1

    db.commit()
    db.close()
    print(f"\n🎉 Selesai! {added} alternatif baru ditambahkan.")


if __name__ == "__main__":
    run_migration()
