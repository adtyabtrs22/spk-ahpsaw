"""
Seed data sesuai dengan perhitungan manual Excel.
Membuat user default, project, kriteria, sub-kriteria,
matriks perbandingan berpasangan, alternatif, dan skor.
"""

from app.database import SessionLocal
from app.models import (
    User, UserRole, Project, Criteria, SubCriteria,
    PairwiseCriteria, PairwiseSubCriteria,
    Alternative, AlternativeScore,
)
from app.auth import get_password_hash


def seed_database():
    db = SessionLocal()

    # Cek apakah sudah ada data
    if db.query(User).first():
        print("Database sudah berisi data. Skip seeding.")
        db.close()
        return

    print("Seeding database...")

    # ─── Users ───────────────────────────────────────────────────────────
    admin = User(
        username="admin",
        full_name="Administrator Sistem",
        email="admin@binamarga.pu.go.id",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.ADMIN,
    )
    operator = User(
        username="operator",
        full_name="Staff Teknis Bidang Jalan",
        email="operator@binamarga.pu.go.id",
        hashed_password=get_password_hash("operator123"),
        role=UserRole.OPERATOR,
    )
    pimpinan = User(
        username="pimpinan",
        full_name="Kepala Bidang Bina Marga",
        email="pimpinan@binamarga.pu.go.id",
        hashed_password=get_password_hash("pimpinan123"),
        role=UserRole.PIMPINAN,
    )
    db.add_all([admin, operator, pimpinan])
    db.flush()

    # ─── Project ─────────────────────────────────────────────────────────
    project = Project(
        name="Prioritas Perbaikan Jalan Kabupaten",
        description="Sistem pendukung keputusan untuk menentukan prioritas lokasi "
                    "perbaikan jalan menggunakan metode AHP-SAW. "
                    "Berdasarkan SK No.77 Dirjen Bina Marga.",
        created_by=admin.id,
    )
    db.add(project)
    db.flush()

    # ─── Kriteria ────────────────────────────────────────────────────────
    c1 = Criteria(project_id=project.id, name="Faktor Kondisi Jalan", display_order=1)
    c2 = Criteria(project_id=project.id, name="Faktor Volume Lalu Lintas", display_order=2)
    c3 = Criteria(project_id=project.id, name="Faktor Tata Guna Lahan", display_order=3)
    db.add_all([c1, c2, c3])
    db.flush()

    # ─── Sub-Kriteria ────────────────────────────────────────────────────
    # Kondisi Jalan
    sc1 = SubCriteria(criteria_id=c1.id, name="Lubang-Lubang", criteria_type="benefit", display_order=1)
    sc2 = SubCriteria(criteria_id=c1.id, name="Lenggokan / Amblas", criteria_type="benefit", display_order=2)
    sc3 = SubCriteria(criteria_id=c1.id, name="Bahu Jalan", criteria_type="benefit", display_order=3)
    sc4 = SubCriteria(criteria_id=c1.id, name="Kemiringan Jalan", criteria_type="benefit", display_order=4)

    # Volume Lalu Lintas
    sc5 = SubCriteria(criteria_id=c2.id, name="Truk Ringan", criteria_type="benefit", display_order=1)
    sc6 = SubCriteria(criteria_id=c2.id, name="Truk Sedang dan Berat", criteria_type="benefit", display_order=2)
    sc7 = SubCriteria(criteria_id=c2.id, name="Mobil Roda 4", criteria_type="benefit", display_order=3)
    sc8 = SubCriteria(criteria_id=c2.id, name="Sepeda Motor", criteria_type="benefit", display_order=4)

    # Tata Guna Lahan
    sc9 = SubCriteria(criteria_id=c3.id, name="Bidang Pertanian", criteria_type="benefit", display_order=1)
    sc10 = SubCriteria(criteria_id=c3.id, name="Bidang Pendidikan", criteria_type="benefit", display_order=2)
    sc11 = SubCriteria(criteria_id=c3.id, name="Bidang Sosial-Budaya", criteria_type="benefit", display_order=3)
    sc12 = SubCriteria(criteria_id=c3.id, name="Bidang Perdagangan-Jasa", criteria_type="benefit", display_order=4)

    all_subs = [sc1, sc2, sc3, sc4, sc5, sc6, sc7, sc8, sc9, sc10, sc11, sc12]
    db.add_all(all_subs)
    db.flush()

    # ─── Matriks Perbandingan Kriteria (dari Excel) ──────────────────────
    # Matriks: KJ vs VLL = 3, KJ vs TGL = 5, VLL vs TGL = 2
    pairwise_criteria_data = [
        (c1.id, c2.id, 3.0),
        (c1.id, c3.id, 5.0),
        (c2.id, c3.id, 2.0),
    ]
    for ci, cj, val in pairwise_criteria_data:
        db.add(PairwiseCriteria(project_id=project.id, criteria_i=ci, criteria_j=cj, value=val))

    # ─── Matriks Perbandingan Sub-Kriteria Kondisi Jalan (dari Excel) ────
    pw_kondisi = [
        (sc1.id, sc2.id, 0.5),    # Lubang vs Lenggokan
        (sc1.id, sc3.id, 3.0),    # Lubang vs Bahu
        (sc1.id, sc4.id, 5.0),    # Lubang vs Kemiringan
        (sc2.id, sc3.id, 5.0),    # Lenggokan vs Bahu
        (sc2.id, sc4.id, 7.0),    # Lenggokan vs Kemiringan
        (sc3.id, sc4.id, 2.0),    # Bahu vs Kemiringan
    ]
    for si, sj, val in pw_kondisi:
        db.add(PairwiseSubCriteria(criteria_id=c1.id, subcriteria_i=si, subcriteria_j=sj, value=val))

    # ─── Matriks Perbandingan Sub-Kriteria Volume Lalu Lintas (dari Excel)
    pw_volume = [
        (sc5.id, sc6.id, 1/3),    # TrukRingan vs TrukBerat
        (sc5.id, sc7.id, 0.5),    # TrukRingan vs Mobil
        (sc5.id, sc8.id, 2.0),    # TrukRingan vs Motor
        (sc6.id, sc7.id, 3.0),    # TrukBerat vs Mobil
        (sc6.id, sc8.id, 5.0),    # TrukBerat vs Motor
        (sc7.id, sc8.id, 3.0),    # Mobil vs Motor
    ]
    for si, sj, val in pw_volume:
        db.add(PairwiseSubCriteria(criteria_id=c2.id, subcriteria_i=si, subcriteria_j=sj, value=val))

    # ─── Matriks Perbandingan Sub-Kriteria Tata Guna Lahan (dari Excel) ──
    pw_lahan = [
        (sc9.id, sc10.id, 1/3),   # Pertanian vs Pendidikan
        (sc9.id, sc11.id, 0.5),   # Pertanian vs SosBud
        (sc9.id, sc12.id, 0.2),   # Pertanian vs Dagang
        (sc10.id, sc11.id, 2.0),  # Pendidikan vs SosBud
        (sc10.id, sc12.id, 0.5),  # Pendidikan vs Dagang
        (sc11.id, sc12.id, 1/3),  # SosBud vs Dagang
    ]
    for si, sj, val in pw_lahan:
        db.add(PairwiseSubCriteria(criteria_id=c3.id, subcriteria_i=si, subcriteria_j=sj, value=val))

    # ─── Alternatif (5 Ruas Jalan dari Excel) ────────────────────────────
    a1 = Alternative(project_id=project.id, name="Jalan MT Haryono",
                     description="Jalan penghubung kawasan perdagangan utama")
    a2 = Alternative(project_id=project.id, name="Jalan Soekarno-Hatta",
                     description="Jalan arteri primer penghubung antar kota")
    a3 = Alternative(project_id=project.id, name="Jalan Inpres",
                     description="Jalan lokal kawasan industri dan perumahan")
    a4 = Alternative(project_id=project.id, name="Jalan Jenderal Sudirman",
                     description="Jalan utama pusat kota dan perkantoran")
    a5 = Alternative(project_id=project.id, name="Jalan Prapatan",
                     description="Jalan penghubung kawasan pertanian dan perkebunan")
    db.add_all([a1, a2, a3, a4, a5])
    db.flush()

    # ─── Skor Alternatif (dari Excel: Matriks Keputusan) ─────────────────
    # Format: (alternative, subcriteria, score)
    # Data sesuai Excel sheet SAW bagian B
    scores_data = [
        # Jalan MT Haryono
        (a1.id, sc1.id, 4), (a1.id, sc2.id, 3), (a1.id, sc3.id, 8), (a1.id, sc4.id, 3),
        (a1.id, sc5.id, 7), (a1.id, sc6.id, 6), (a1.id, sc7.id, 9), (a1.id, sc8.id, 10),
        (a1.id, sc9.id, 2), (a1.id, sc10.id, 7), (a1.id, sc11.id, 7), (a1.id, sc12.id, 10),
        # Jalan Soekarno-Hatta
        (a2.id, sc1.id, 3), (a2.id, sc2.id, 2), (a2.id, sc3.id, 9), (a2.id, sc4.id, 4),
        (a2.id, sc5.id, 6), (a2.id, sc6.id, 5), (a2.id, sc7.id, 10), (a2.id, sc8.id, 9),
        (a2.id, sc9.id, 1), (a2.id, sc10.id, 8), (a2.id, sc11.id, 9), (a2.id, sc12.id, 10),
        # Jalan Inpres
        (a3.id, sc1.id, 7), (a3.id, sc2.id, 6), (a3.id, sc3.id, 6), (a3.id, sc4.id, 5),
        (a3.id, sc5.id, 8), (a3.id, sc6.id, 10), (a3.id, sc7.id, 8), (a3.id, sc8.id, 7),
        (a3.id, sc9.id, 4), (a3.id, sc10.id, 4), (a3.id, sc11.id, 4), (a3.id, sc12.id, 9),
        # Jalan Jenderal Sudirman
        (a4.id, sc1.id, 6), (a4.id, sc2.id, 5), (a4.id, sc3.id, 6), (a4.id, sc4.id, 6),
        (a4.id, sc5.id, 8), (a4.id, sc6.id, 8), (a4.id, sc7.id, 7), (a4.id, sc8.id, 8),
        (a4.id, sc9.id, 3), (a4.id, sc10.id, 5), (a4.id, sc11.id, 6), (a4.id, sc12.id, 8),
        # Jalan Prapatan
        (a5.id, sc1.id, 8), (a5.id, sc2.id, 7), (a5.id, sc3.id, 5), (a5.id, sc4.id, 5),
        (a5.id, sc5.id, 5), (a5.id, sc6.id, 4), (a5.id, sc7.id, 6), (a5.id, sc8.id, 7),
        (a5.id, sc9.id, 8), (a5.id, sc10.id, 4), (a5.id, sc11.id, 4), (a5.id, sc12.id, 4),
    ]
    for alt_id, sub_id, score in scores_data:
        db.add(AlternativeScore(alternative_id=alt_id, subcriteria_id=sub_id, score=score))

    db.commit()
    db.close()
    print("Seeding selesai! Data berhasil dimuat.")
    print("  Users: admin/admin123, operator/operator123, pimpinan/pimpinan123")
    print("  Project: Prioritas Perbaikan Jalan Kabupaten")
    print("  Kriteria: 3 kriteria utama, 12 sub-kriteria")
    print("  Alternatif: 5 ruas jalan")


if __name__ == "__main__":
    seed_database()
