from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# --- Caixa ---
class CaixaAbrir(BaseModel):
    saldo_inicial: float = 0.0
    observacao: Optional[str] = None


class CaixaFechar(BaseModel):
    saldo_final: float
    observacao: Optional[str] = None


class CaixaOut(BaseModel):
    id: int
    data_abertura: datetime
    saldo_inicial: float
    data_fechamento: Optional[datetime]
    saldo_final: Optional[float]
    observacao: Optional[str]
    status: str

    model_config = {"from_attributes": True}


class CaixaResumo(CaixaOut):
    total_vendas: float = 0.0
    total_gastos: float = 0.0
    lucro: float = 0.0
    num_vendas: int = 0


# --- Venda ---
class VendaCreate(BaseModel):
    descricao: str
    quantidade: float = 1.0
    valor_unitario: float
    categoria: str = "outros"


class VendaOut(BaseModel):
    id: int
    caixa_id: int
    descricao: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    categoria: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Gasto ---
class GastoCreate(BaseModel):
    descricao: str
    valor: float
    categoria: str = "outros"
    caixa_id: Optional[int] = None


class GastoOut(BaseModel):
    id: int
    caixa_id: Optional[int]
    descricao: str
    valor: float
    categoria: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Cliente ---
class ClienteCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    observacao: Optional[str] = None


class ClienteOut(BaseModel):
    id: int
    nome: str
    telefone: Optional[str]
    observacao: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClienteComSaldo(ClienteOut):
    total_devido: float = 0.0
    num_fiados_abertos: int = 0


# --- Fiado ---
class FiadoCreate(BaseModel):
    cliente_id: int
    descricao: str
    valor: float


class FiadoOut(BaseModel):
    id: int
    cliente_id: int
    descricao: str
    valor: float
    pago: bool
    created_at: datetime
    data_pagamento: Optional[datetime]

    model_config = {"from_attributes": True}


class FiadoComCliente(FiadoOut):
    cliente_nome: str = ""


# --- Dashboard ---
class DashboardOut(BaseModel):
    caixa_aberta: Optional[CaixaResumo]
    total_fiado_aberto: float
    num_clientes_com_fiado: int
    resumo_semana: List[dict] = []
