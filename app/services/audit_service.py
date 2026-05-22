import logging
from sqlalchemy.orm import Session
from app.models.AuditLogModel import AuditLog

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def registrar_acao(db: Session, user_id: str, acao: str):
        """
        Salva uma linha de histórico para o usuário no banco de dados.
        """
        try:
            novo_log = AuditLog(user_id=user_id, action=acao)
            db.add(novo_log)
            db.commit()
            logger.info(f"AUDITORIA: Ação '{acao}' registrada para o ID: {user_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"AUDITORIA ERRO: Falha ao salvar histórico: {str(e)}")