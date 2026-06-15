from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Fiado, Cliente
from ..schemas import FiadoCreate, FiadoOut, FiadoComCliente

router = APIRouter(prefix="/fiado", tags=["fiado"])


@router.get("/", response_model=List[FiadoComCliente])
def listar_fiados(cliente_id: int | None = None, apenas_abertos: bool = True, db: Session = Depends(get_db)):
    q = db.query(Fiado).options(joinedload(Fiado.cliente))
    if cliente_id:
        q = q.filter(Fiado.cliente_id == cliente_id)
    if apenas_abertos:
        q = q.filter(Fiado.pago == False)
    fiados = q.order_by(Fiado.created_at.desc()).all()
    result = []
    for f in fiados:
        d = FiadoOut.model_validate(f).model_dump()
        d["cliente_nome"] = f.cliente.nome if f.cliente else ""
        result.append(FiadoComCliente(**d))
    return result


@router.post("/", response_model=FiadoOut)
def registrar_fiado(payload: FiadoCreate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == payload.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    fiado = Fiado(**payload.model_dump())
    db.add(fiado)
    db.commit()
    db.refresh(fiado)
    return fiado


@router.patch("/{fiado_id}/pagar", response_model=FiadoOut)
def pagar_fiado(fiado_id: int, db: Session = Depends(get_db)):
    fiado = db.query(Fiado).filter(Fiado.id == fiado_id).first()
    if not fiado:
        raise HTTPException(status_code=404, detail="Fiado não encontrado")
    fiado.pago = True
    fiado.data_pagamento = datetime.utcnow()
    db.commit()
    db.refresh(fiado)
    return fiado


@router.delete("/{fiado_id}")
def deletar_fiado(fiado_id: int, db: Session = Depends(get_db)):
    fiado = db.query(Fiado).filter(Fiado.id == fiado_id).first()
    if not fiado:
        raise HTTPException(status_code=404, detail="Fiado não encontrado")
    db.delete(fiado)
    db.commit()
    return {"ok": True}
