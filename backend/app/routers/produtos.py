from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Produto
from ..schemas import ProdutoCreate, ProdutoUpdate, ProdutoOut, EntradaEstoque

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.get("/", response_model=List[ProdutoOut])
def listar_produtos(apenas_ativos: bool = True, db: Session = Depends(get_db)):
    q = db.query(Produto)
    if apenas_ativos:
        q = q.filter(Produto.ativo == True)
    return q.order_by(Produto.nome).all()


@router.post("/", response_model=ProdutoOut)
def criar_produto(payload: ProdutoCreate, db: Session = Depends(get_db)):
    produto = Produto(**payload.model_dump())
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return produto


@router.put("/{produto_id}", response_model=ProdutoOut)
def atualizar_produto(produto_id: int, payload: ProdutoUpdate, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(produto, field, value)
    db.commit()
    db.refresh(produto)
    return produto


@router.delete("/{produto_id}")
def desativar_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto.ativo = False
    db.commit()
    return {"ok": True}


@router.post("/{produto_id}/entrada", response_model=ProdutoOut)
def entrada_estoque(produto_id: int, payload: EntradaEstoque, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if payload.quantidade <= 0:
        raise HTTPException(status_code=400, detail="Quantidade deve ser positiva")
    produto.quantidade_estoque += payload.quantidade
    db.commit()
    db.refresh(produto)
    return produto
