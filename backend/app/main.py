from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import caixa, vendas, gastos, clientes, fiado, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bar Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bar.dmelo.uk", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(caixa.router)
app.include_router(vendas.router)
app.include_router(gastos.router)
app.include_router(clientes.router)
app.include_router(fiado.router)


@app.get("/health")
def health():
    return {"status": "ok"}
