from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Gasto, Caixa
from ..schemas import GastoCreate, GastoOut

router = APIRouter(prefix="/gastos", tags=["gastos"])


@router.get("/", response_model=List[GastoOut])
def listar_gastos(caixa_id: int | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(Gasto)
    if caixa_id:
        q = q.filter(Gasto.caixa_id == caixa_id)
    return q.order_by(Gasto.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=GastoOut)
def registrar_gasto(payload: GastoCreate, db: Session = Depends(get_db)):
    caixa_id = payload.caixa_id
    if not caixa_id:
        caixa = db.query(Caixa).filter(Caixa.status == "aberto").first()
        if not caixa:
            raise HTTPException(status_code=400, detail="Abra o caixa antes de registrar gastos")
        caixa_id = caixa.id
    gasto = Gasto(
        caixa_id=caixa_id,
        descricao=payload.descricao,
        valor=payload.valor,
        categoria=payload.categoria,
    )
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    return gasto


@router.delete("/{gasto_id}")
def cancelar_gasto(gasto_id: int, db: Session = Depends(get_db)):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto não encontrado")
    db.delete(gasto)
    db.commit()
    return {"ok": True}
