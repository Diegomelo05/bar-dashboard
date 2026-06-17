from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Caixa, Venda, Gasto, Fiado, Cliente
from ..schemas import DashboardOut, CaixaResumo, CaixaOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _margem_liquida(db: Session, caixa_id: int) -> float:
    """Soma (valor_total - custo_total) das vendas. Vendas sem custo tratam custo=0."""
    result = db.query(
        func.sum(
            Venda.valor_total - func.coalesce(Venda.preco_custo * Venda.quantidade, 0.0)
        )
    ).filter(Venda.caixa_id == caixa_id).scalar()
    return result or 0.0


def _margem_periodo(db: Session, inicio: datetime, fim: datetime) -> float:
    result = db.query(
        func.sum(
            Venda.valor_total - func.coalesce(Venda.preco_custo * Venda.quantidade, 0.0)
        )
    ).filter(Venda.created_at >= inicio, Venda.created_at <= fim).scalar()
    return result or 0.0


@router.get("/", response_model=DashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    caixa = db.query(Caixa).filter(Caixa.status == "aberto").first()
    caixa_resumo = None
    if caixa:
        total_vendas = db.query(func.sum(Venda.valor_total)).filter(Venda.caixa_id == caixa.id).scalar() or 0.0
        total_gastos = db.query(func.sum(Gasto.valor)).filter(Gasto.caixa_id == caixa.id).scalar() or 0.0
        num_vendas = db.query(func.count(Venda.id)).filter(Venda.caixa_id == caixa.id).scalar() or 0
        margem = _margem_liquida(db, caixa.id)
        caixa_resumo = CaixaResumo(
            **CaixaOut.model_validate(caixa).model_dump(),
            total_vendas=total_vendas,
            total_gastos=total_gastos,
            lucro=margem - total_gastos,
            num_vendas=num_vendas,
        )

    total_fiado = db.query(func.sum(Fiado.valor)).filter(Fiado.pago == False).scalar() or 0.0
    num_clientes_fiado = db.query(func.count(func.distinct(Fiado.cliente_id))).filter(Fiado.pago == False).scalar() or 0

    hoje = datetime.utcnow().date()
    resumo_semana = []
    for i in range(6, -1, -1):
        dia = hoje - timedelta(days=i)
        inicio = datetime(dia.year, dia.month, dia.day, 0, 0, 0)
        fim = datetime(dia.year, dia.month, dia.day, 23, 59, 59)
        vendas_dia = db.query(func.sum(Venda.valor_total)).filter(
            Venda.created_at >= inicio, Venda.created_at <= fim
        ).scalar() or 0.0
        gastos_dia = db.query(func.sum(Gasto.valor)).filter(
            Gasto.created_at >= inicio, Gasto.created_at <= fim
        ).scalar() or 0.0
        margem_dia = _margem_periodo(db, inicio, fim)
        resumo_semana.append({
            "data": dia.strftime("%d/%m"),
            "vendas": vendas_dia,
            "gastos": gastos_dia,
            "lucro": margem_dia - gastos_dia,
        })

    return DashboardOut(
        caixa_aberta=caixa_resumo,
        total_fiado_aberto=total_fiado,
        num_clientes_com_fiado=num_clientes_fiado,
        resumo_semana=resumo_semana,
    )
