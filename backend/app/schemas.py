from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ─── Auth ────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str
    password: str
    role: str = "operator"

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Project ─────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by: int
    created_at: datetime
    creator_name: Optional[str] = None
    criteria_count: Optional[int] = 0
    alternative_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Criteria ────────────────────────────────────────────────────────────

class SubCriteriaCreate(BaseModel):
    name: str
    criteria_type: str = "benefit"
    display_order: int = 0

class SubCriteriaResponse(BaseModel):
    id: int
    criteria_id: int
    name: str
    weight_local: Optional[float]
    weight_global: Optional[float]
    criteria_type: str
    display_order: int

    class Config:
        from_attributes = True

class CriteriaUpdate(BaseModel):
    name: str

class SubCriteriaUpdate(BaseModel):
    name: str

class CriteriaCreate(BaseModel):
    name: str
    display_order: int = 0
    sub_criteria: List[SubCriteriaCreate] = []

class CriteriaResponse(BaseModel):
    id: int
    project_id: int
    name: str
    weight: Optional[float]
    display_order: int
    sub_criteria: List[SubCriteriaResponse] = []

    class Config:
        from_attributes = True


# ─── Pairwise Comparison ────────────────────────────────────────────────

class PairwiseEntry(BaseModel):
    row_id: int
    col_id: int
    value: float

class PairwiseInput(BaseModel):
    entries: List[PairwiseEntry]

class ConsistencyResult(BaseModel):
    lambda_max: float
    ci: float
    ri: float
    cr: float
    is_consistent: bool
    weights: dict  # {id: weight}


# ─── Alternative ─────────────────────────────────────────────────────────

class AlternativeCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ScoreEntry(BaseModel):
    subcriteria_id: int
    score: float

class AlternativeScoreInput(BaseModel):
    alternative_id: int
    scores: List[ScoreEntry]

class AlternativeResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str]
    scores: Optional[dict] = None  # {subcriteria_id: score}

    class Config:
        from_attributes = True


# ─── Calculation Results ─────────────────────────────────────────────────

class RankingEntry(BaseModel):
    alternative_id: int
    alternative_name: str
    normalized_scores: dict
    weighted_scores: dict
    preference_value: float
    rank: int

class CalculationResponse(BaseModel):
    project_id: int
    criteria_weights: dict
    subcriteria_weights: dict
    consistency_results: dict
    decision_matrix: dict
    normalized_matrix: dict
    rankings: List[RankingEntry]
    calculated_at: datetime
