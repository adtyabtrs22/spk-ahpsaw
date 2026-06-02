import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Enum, ForeignKey, JSON, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    PIMPINAN = "pimpinan"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.OPERATOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", backref="projects")
    criteria = relationship("Criteria", back_populates="project", cascade="all, delete-orphan")
    alternatives = relationship("Alternative", back_populates="project", cascade="all, delete-orphan")
    pairwise_criteria = relationship("PairwiseCriteria", back_populates="project", cascade="all, delete-orphan")
    calculation_results = relationship("CalculationResult", back_populates="project", cascade="all, delete-orphan")


class Criteria(Base):
    __tablename__ = "criteria"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    weight = Column(Float, nullable=True)  # Bobot dari AHP
    display_order = Column(Integer, default=0)

    project = relationship("Project", back_populates="criteria")
    sub_criteria = relationship("SubCriteria", back_populates="criteria", cascade="all, delete-orphan")
    pairwise_sub = relationship("PairwiseSubCriteria", back_populates="criteria", cascade="all, delete-orphan")


class SubCriteria(Base):
    __tablename__ = "sub_criteria"

    id = Column(Integer, primary_key=True, index=True)
    criteria_id = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    weight_local = Column(Float, nullable=True)   # Bobot lokal (dalam kriteria induk)
    weight_global = Column(Float, nullable=True)   # Bobot global = bobot kriteria × bobot lokal
    criteria_type = Column(String(10), default="benefit")  # benefit or cost
    display_order = Column(Integer, default=0)

    criteria = relationship("Criteria", back_populates="sub_criteria")
    scores = relationship("AlternativeScore", back_populates="sub_criteria", cascade="all, delete-orphan")


class PairwiseCriteria(Base):
    """Matriks perbandingan berpasangan antar kriteria utama."""
    __tablename__ = "pairwise_criteria"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    criteria_i = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    criteria_j = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)  # Skala Saaty 1-9 atau resiprokalnya

    project = relationship("Project", back_populates="pairwise_criteria")
    row_criteria = relationship("Criteria", foreign_keys=[criteria_i])
    col_criteria = relationship("Criteria", foreign_keys=[criteria_j])


class PairwiseSubCriteria(Base):
    """Matriks perbandingan berpasangan antar sub-kriteria dalam satu kriteria."""
    __tablename__ = "pairwise_sub_criteria"

    id = Column(Integer, primary_key=True, index=True)
    criteria_id = Column(Integer, ForeignKey("criteria.id", ondelete="CASCADE"), nullable=False)
    subcriteria_i = Column(Integer, ForeignKey("sub_criteria.id", ondelete="CASCADE"), nullable=False)
    subcriteria_j = Column(Integer, ForeignKey("sub_criteria.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)

    criteria = relationship("Criteria", back_populates="pairwise_sub")
    row_sub = relationship("SubCriteria", foreign_keys=[subcriteria_i])
    col_sub = relationship("SubCriteria", foreign_keys=[subcriteria_j])


class Alternative(Base):
    """Alternatif (ruas jalan) yang akan diranking."""
    __tablename__ = "alternatives"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    project = relationship("Project", back_populates="alternatives")
    scores = relationship("AlternativeScore", back_populates="alternative", cascade="all, delete-orphan")
    results = relationship("CalculationResult", back_populates="alternative", cascade="all, delete-orphan")


class AlternativeScore(Base):
    """Nilai alternatif pada setiap sub-kriteria (matriks keputusan X)."""
    __tablename__ = "alternative_scores"

    id = Column(Integer, primary_key=True, index=True)
    alternative_id = Column(Integer, ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False)
    subcriteria_id = Column(Integer, ForeignKey("sub_criteria.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)

    alternative = relationship("Alternative", back_populates="scores")
    sub_criteria = relationship("SubCriteria", back_populates="scores")


class CalculationResult(Base):
    """Hasil kalkulasi AHP-SAW: nilai preferensi dan ranking per alternatif."""
    __tablename__ = "calculation_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    alternative_id = Column(Integer, ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False)
    normalized_scores = Column(JSON, nullable=True)   # {subcriteria_id: r_ij}
    weighted_scores = Column(JSON, nullable=True)      # {subcriteria_id: w_j * r_ij}
    preference_value = Column(Float, nullable=False)   # V_i
    rank = Column(Integer, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="calculation_results")
    alternative = relationship("Alternative", back_populates="results")


class ConsistencyLog(Base):
    """Log uji konsistensi AHP (CR) per matriks perbandingan."""
    __tablename__ = "consistency_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    matrix_type = Column(String(50), nullable=False)  # "criteria" or "subcriteria_{criteria_id}"
    lambda_max = Column(Float, nullable=True)
    ci = Column(Float, nullable=True)
    ri = Column(Float, nullable=True)
    cr = Column(Float, nullable=True)
    is_consistent = Column(Boolean, default=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)
