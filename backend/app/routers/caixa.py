from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Caixa, Venda, Gasto
from ..schemas import CaixaAbrir, CaixaFechar, CaixaOut, CaixaResumo

router = APIRouter(prefix="/caixa", tags=["caixa"])


def _build_resumo(caixa: Caixa, db: Session) -> CaixaResumo:
    total_vendas = db.query(func.sum(Venda.valor_total)).filter(Venda.caixa_id == caixa.id).scalar() or 0.0
    total_gastos = db.query(func.sum(Gasto.valor)).filter(Gasto.caixa_id == caixa.id).scalar() or 0.0
    num_vendas = db.query(func.count(Venda.id)).filter(Venda.caixa_id == caixa.id).scalar() or 0
    return CaixaResumo(
        **CaixaOut.model_validate(caixa).model_dump(),
        total_vendas=total_vendas,
        total_gastos=total_gastos,
        lucro=total_vendas - total_gastos,
        num_vendas=num_vendas,
    )


@router.get("/atual", response_model=CaixaResumo)
def get_caixa_atual(db: Session = Depends(get_db)):
    caixa = db.query(Caixa).filter(Caixa.status == "aberto").first()
    if not caixa:
        raise HTTPException(status_code=404, detail="Nenhum caixa aberto")
    return _build_resumo(caixa, db)


@router.post("/abrir", response_model=CaixaResumo)
def abrir_caixa(payload: CaixaAbrir, db: Session = Depends(get_db)):
    aberto = db.query(Caixa).filter(Caixa.status == "aberto").first()
    if aberto:
        raise HTTPException(status_code=400, detail="Já existe um caixa aberto")
    caixa = Caixa(saldo_inicial=payload.saldo_inicial, observacao=payload.observacao)
    db.add(caixa)
    db.commit()
    db.refresh(caixa)
    return _build_resumo(caixa, db)


@router.post("/fechar", response_model=CaixaResumo)
def fechar_caixa(payload: CaixaFechar, db: Session = Depends(get_db)):
    caixa = db.query(Caixa).filter(Caixa.status == "aberto").first()
    if not caixa:
        raise HTTPException(status_code=404, detail="Nenhum caixa aberto")
    caixa.status = "fechado"
    caixa.data_fechamento = datetime.utcnow()
    caixa.saldo_final = payload.saldo_final
    if payload.observacao:
        caixa.observacao = payload.observacao
    db.commit()
    db.refresh(caixa)
    return _build_resumo(caixa, db)


@router.get("/historico", response_model=List[CaixaResumo])
def historico(skip: int = 0, limit: int = 30, db: Session = Depends(get_db)):
    caixas = db.query(Caixa).order_by(Caixa.data_abertura.desc()).offset(skip).limit(limit).all()
    return [_build_resumo(c, db) for c in caixas]


@router.get("/{caixa_id}", response_model=CaixaResumo)
def get_caixa(caixa_id: int, db: Session = Depends(get_db)):
    caixa = db.query(Caixa).filter(Caixa.id == caixa_id).first()
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")
    return _build_resumo(caixa, db)
