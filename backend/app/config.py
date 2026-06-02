import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:aditya221004@localhost:5432/spk_ahpsaw"
)

SECRET_KEY = os.getenv("SECRET_KEY", "spk-ahpsaw-secret-key-kementerian-pu-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# CORS dinamis — baca dari env variable, pisahkan dengan koma
# Contoh .env: CORS_ORIGINS=https://frontend.railway.app,http://localhost:5173
_cors_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

# Saaty Random Index table for consistency check
RI_TABLE = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}
