from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.database import engine, Base
from app.routers import auth, projects, criteria, pairwise, alternatives, calculation

# Create all tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed database on first run."""
    from app.seed import seed_database
    try:
        seed_database()
    except Exception as e:
        print(f"Seed skipped or failed: {e}")
    yield


app = FastAPI(
    title="SPK Prioritas Perbaikan Jalan",
    description="Sistem Pendukung Keputusan menggunakan metode AHP-SAW "
                "untuk menentukan prioritas lokasi perbaikan jalan. "
                "Direktorat Jenderal Bina Marga - Kementerian Pekerjaan Umum.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(criteria.router)
app.include_router(pairwise.router)
app.include_router(alternatives.router)
app.include_router(calculation.router)


@app.get("/")
def root():
    return {
        "nama": "SPK Prioritas Perbaikan Jalan",
        "versi": "1.0.0",
        "organisasi": "Direktorat Jenderal Bina Marga - Kementerian Pekerjaan Umum",
        "metode": "AHP (Pembobotan) + SAW (Perangkingan)",
        "status": "aktif",
    }
