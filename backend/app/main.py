import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import caixa, vendas, gastos, clientes, fiado, dashboard
from .auth import require_api_key

Base.metadata.create_all(bind=engine)

_production = os.getenv("ENVIRONMENT") == "production"

app = FastAPI(
    title="Bar Dashboard API",
    version="1.0.0",
    docs_url=None if _production else "/docs",
    redoc_url=None if _production else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bar.dmelo.uk", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_auth = [Depends(require_api_key)]

app.include_router(dashboard.router, dependencies=_auth)
app.include_router(caixa.router, dependencies=_auth)
app.include_router(vendas.router, dependencies=_auth)
app.include_router(gastos.router, dependencies=_auth)
app.include_router(clientes.router, dependencies=_auth)
app.include_router(fiado.router, dependencies=_auth)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/verify", dependencies=_auth)
def verify():
    return {"ok": True}
