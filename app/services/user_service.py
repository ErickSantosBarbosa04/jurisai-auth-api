import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.UserModel import User
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

EDITABLE_USER_FIELDS = (
    "full_name",
    "profile_type",
    "university",
    "semester",
    "legal_specialty",
)

class UserService:
    @staticmethod
    def get_user_profile(current_user: User):
        return current_user

    @staticmethod
    def update_user_profile(db: Session, current_user: User, data):
        user_to_update = db.query(User).filter(User.id == current_user.id).first()

        if not user_to_update:
            logger.warning(f"SERVICE: Usuario ID {current_user.id} nao encontrado para atualizacao.")
            raise HTTPException(status_code=404, detail="Usuario nao encontrado")

        updates = data.model_dump(exclude_unset=True)
        for field in EDITABLE_USER_FIELDS:
            if field in updates:
                setattr(user_to_update, field, updates[field])

        user_to_update.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user_to_update)


        AuditService.registrar_acao(db, str(current_user.id), "Perfil de usuário e dados pessoais atualizados.")

        logger.info(f"SERVICE: Perfil atualizado para user_id={user_to_update.id}")
        return user_to_update

    @staticmethod

    def export_user_data(db: Session, current_user: User):
        logger.info(f"SERVICE: Preparando exportação de dados para ID: {current_user.id}")

        AuditService.registrar_acao(db, str(current_user.id), "Exportação de dados solicitada (Direito de Acesso LGPD).")
        
        return {
            "user_id": current_user.id,
            "email": current_user.email,
            "is_2fa_enabled": current_user.is_2fa_enabled,
            "data_criacao": current_user.created_at,
            "data_atualizacao": current_user.updated_at,
            "perfil": {
                "nome_completo": current_user.full_name,
                "tipo_perfil": current_user.profile_type,
                "faculdade": current_user.university,
                "semestre": current_user.semester,
                "especialidade_juridica": current_user.legal_specialty
            },
            "lgpd": {
                "consentimento_ativo": current_user.lgpd_consent,
                "finalidade": current_user.consent_purpose,
                "data_consentimento": current_user.consent_date,
                "versao_termos": current_user.terms_version
            },
            "seguranca": {
                "tentativas_falhas_acumuladas": current_user.failed_login_attempts
            },
            "message": "Dados extraídos conforme conformidade LGPD (Direito de Acesso)."
        }

    @staticmethod
    def delete_user_account(db: Session, current_user: User):
        try:
            user_to_delete = db.query(User).filter(User.id == current_user.id).first()
            
            if not user_to_delete:
                logger.warning(f"SERVICE: Usuário ID {current_user.id} não encontrado.")
                raise HTTPException(status_code=404, detail="Usuário não encontrado")

            user_email = user_to_delete.email

            
            AuditService.registrar_acao(db, str(current_user.id), "Solicitação de exclusão permanente de conta (Direito ao Esquecimento).")

            db.delete(user_to_delete)
            db.flush()  
            db.commit()
            
            db.expire_all() 

            logger.info(f"SERVICE: Usuário {user_email} (ID: {current_user.id}) excluído com sucesso.")
            return {"message": "Sua conta e dados foram removidos com sucesso conforme o Direito ao Esquecimento (LGPD)."}

        except Exception as e:
            db.rollback()
            # Log detalhado para você ver no terminal do VS Code o que travou
            logger.error(f"ERRO CRÍTICO NA EXCLUSÃO (ID: {current_user.id}): {str(e)}")
            
            # Se já for uma exceção do FastAPI, repassa ela
            if isinstance(e, HTTPException):
                raise e
                
            # Caso contrário, lança o 500 com o detalhe do erro real
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Erro no banco de dados: {str(e)}"
            )