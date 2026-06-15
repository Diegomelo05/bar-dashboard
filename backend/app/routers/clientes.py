from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Cliente, Fiado
from ..schemas import ClienteCreate, ClienteOut, ClienteComSaldo

router = APIRouter(prefix="/clientes", tags=["clientes"])


def _com_saldo(cliente: Cliente, db: Session) -> ClienteComSaldo:
    total = db.query(func.sum(Fiado.valor)).filter(
        Fiado.cliente_id == cliente.id, Fiado.pago == False
    ).scalar() or 0.0
    num = db.query(func.count(Fiado.id)).filter(
        Fiado.cliente_id == cliente.id, Fiado.pago == False
    ).scalar() or 0
    return ClienteComSaldo(**ClienteOut.model_validate(cliente).model_dump(), total_devido=total, num_fiados_abertos=num)


@router.get("/", response_model=List[ClienteComSaldo])
def listar_clientes(db: Session = Depends(get_db)):
    clientes = db.query(Cliente).order_by(Cliente.nome).all()
    return [_com_saldo(c, db) for c in clientes]


@router.post("/", response_model=ClienteOut)
def criar_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/{cliente_id}", response_model=ClienteComSaldo)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _com_saldo(cliente, db)


@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, payload: ClienteCreate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    for k, v in payload.model_dump().items():
        setattr(cliente, k, v)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
def deletar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()
    return {"ok": True}
