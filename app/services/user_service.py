import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.UserModel import User

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
    # Lógica para retornar o perfil. (Requisito 4.8: Consulta aos dados) 
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

        logger.info(f"SERVICE: Perfil atualizado para user_id={user_to_update.id}")
        return user_to_update

    @staticmethod
    # Garante que todos os dados coletados sejam exportados. (Requisito 4.9)  
    def export_user_data(current_user: User):
        logger.info(f"SERVICE: Preparando exportação de dados para ID: {current_user.id}")
        
        # Incluímos os metadados de LGPD para transparência total
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
    # Executa a exclusão definitiva (Direito ao Esquecimento). (Requisito 4.10) 
    def delete_user_account(db: Session, current_user: User):
        try:
            # 1. Buscamos o usuário usando a sessão ativa para evitar conflito de instâncias
            user_to_delete = db.query(User).filter(User.id == current_user.id).first()
            
            if not user_to_delete:
                logger.warning(f"SERVICE: Usuário ID {current_user.id} não encontrado.")
                raise HTTPException(status_code=404, detail="Usuário não encontrado")

            user_email = user_to_delete.email

            # Deletamos, forçamos o flush e limpamos a sessão
            db.delete(user_to_delete)
            db.flush()  # Valida integridade antes do commit final
            db.commit()
            
            # Limpa o cache da sessão para garantir que o objeto sumiu da memória
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
