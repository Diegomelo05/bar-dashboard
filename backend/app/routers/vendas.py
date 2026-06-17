from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Venda, Caixa, Produto
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

    preco_custo = payload.preco_custo

    if payload.produto_id:
        produto = db.query(Produto).filter(Produto.id == payload.produto_id, Produto.ativo == True).first()
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        qtd = round(payload.quantidade)
        if produto.quantidade_estoque < qtd:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente. Disponível: {produto.quantidade_estoque} unidade(s)"
            )
        produto.quantidade_estoque -= qtd
        if preco_custo is None:
            preco_custo = produto.preco_custo

    venda = Venda(
        caixa_id=caixa.id,
        produto_id=payload.produto_id,
        descricao=payload.descricao,
        quantidade=payload.quantidade,
        valor_unitario=payload.valor_unitario,
        valor_total=payload.quantidade * payload.valor_unitario,
        preco_custo=preco_custo,
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
    if venda.produto_id:
        produto = db.query(Produto).filter(Produto.id == venda.produto_id).first()
        if produto:
            produto.quantidade_estoque += round(venda.quantidade)
    db.delete(venda)
    db.commit()
    return {"ok": True}
