from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class Caixa(Base):
    __tablename__ = "caixas"

    id = Column(Integer, primary_key=True, index=True)
    data_abertura = Column(DateTime, default=datetime.utcnow, nullable=False)
    saldo_inicial = Column(Float, nullable=False, default=0.0)
    data_fechamento = Column(DateTime, nullable=True)
    saldo_final = Column(Float, nullable=True)
    observacao = Column(Text, nullable=True)
    status = Column(String(10), default="aberto")  # aberto | fechado

    vendas = relationship("Venda", back_populates="caixa")
    gastos = relationship("Gasto", back_populates="caixa")


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    caixa_id = Column(Integer, ForeignKey("caixas.id"), nullable=False)
    descricao = Column(String(200), nullable=False)
    quantidade = Column(Float, default=1.0)
    valor_unitario = Column(Float, nullable=False)
    valor_total = Column(Float, nullable=False)
    categoria = Column(String(50), default="outros")  # bebida | comida | outros
    created_at = Column(DateTime, default=datetime.utcnow)

    caixa = relationship("Caixa", back_populates="vendas")


class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    caixa_id = Column(Integer, ForeignKey("caixas.id"), nullable=True)
    descricao = Column(String(200), nullable=False)
    valor = Column(Float, nullable=False)
    categoria = Column(String(50), default="outros")  # compra | conta | outros
    created_at = Column(DateTime, default=datetime.utcnow)

    caixa = relationship("Caixa", back_populates="gastos")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=True)
    observacao = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    fiados = relationship("Fiado", back_populates="cliente")


class Fiado(Base):
    __tablename__ = "fiados"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    descricao = Column(String(200), nullable=False)
    valor = Column(Float, nullable=False)
    pago = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    data_pagamento = Column(DateTime, nullable=True)

    cliente = relationship("Cliente", back_populates="fiados")
