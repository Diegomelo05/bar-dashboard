from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Venda, Caixa
from ..schemas import VendaCreate, VendaOut

router = APIRouter(prefix="/vendas", tags=["vendas"])


@router.get("/", response_model=List[VendaOut])
def listar_vendas(caixa_id: int | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(Venda)
    if caixa_id:
        q = q.filter(Venda.caixa_id == caixa_id)
    return q.order_by(Venda.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=VendaOut)
def registrar_venda(payload: VendaCreate, db: Session = Depends(get_db)):
    caixa = db.query(Caixa).filter(Caixa.status == "aberto").first()
    if not caixa:
        raise HTTPException(status_code=400, detail="Abra o caixa antes de registrar vendas")
    venda = Venda(
        caixa_id=caixa.id,
        descricao=payload.descricao,
        quantidade=payload.quantidade,
        valor_unitario=payload.valor_unitario,
        valor_total=payload.quantidade * payload.valor_unitario,
        categoria=payload.categoria,
    )
    db.add(venda)
    db.commit()
    db.refresh(venda)
    return venda


@router.delete("/{venda_id}")
def cancelar_venda(venda_id: int, db: Session = Depends(get_db)):
    venda = db.query(Venda).filter(Venda.id == venda_id).first()
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    db.delete(venda)
    db.commit()
    return {"ok": True}
