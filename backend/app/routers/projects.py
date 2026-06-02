from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, User, UserRole, Criteria, Alternative
from app.schemas import ProjectCreate, ProjectResponse
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("/", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    result = []
    for p in projects:
        result.append(ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            created_by=p.created_by,
            created_at=p.created_at,
            creator_name=p.creator.full_name if p.creator else None,
            criteria_count=db.query(Criteria).filter(Criteria.project_id == p.id).count(),
            alternative_count=db.query(Alternative).filter(Alternative.project_id == p.id).count(),
        ))
    return result


@router.post("/", response_model=ProjectResponse)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    project = Project(
        name=payload.name,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        creator_name=current_user.full_name,
        criteria_count=0,
        alternative_count=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        creator_name=project.creator.full_name if project.creator else None,
        criteria_count=db.query(Criteria).filter(Criteria.project_id == project.id).count(),
        alternative_count=db.query(Alternative).filter(Alternative.project_id == project.id).count(),
    )


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    db.delete(project)
    db.commit()
    return {"detail": "Project berhasil dihapus"}
