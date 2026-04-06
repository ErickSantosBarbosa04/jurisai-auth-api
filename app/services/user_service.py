import logging
from sqlalchemy.orm import Session
from app.models.UserModel import User

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    #Lógica para retornar o perfil. No futuro, você pode adicionar (Requisito 4.8) 
    def get_user_profile(current_user: User):
        return current_user

    @staticmethod
    #Garante que apenas os dados permitidos sejam exportados.(Requisito 4.9)  
    def export_user_data(current_user: User):
   
        logger.info(f"SERVICE: Preparando exportação de dados para ID: {current_user.id} ")
        return {
            "user_id": current_user.id,
            "email": current_user.email,
            "is_2fa_enabled": current_user.is_2fa_enabled,
            "message": "Dados extraídos conforme conformidade LGPD."
        }

    @staticmethod
    #Executa a exclusão definitiva (Direito ao Esquecimento). (Requisito 4.10) 
    def delete_user_account(db: Session, current_user: User):

        try:
            user_email = current_user.email
            db.delete(current_user)
            db.commit()
            logger.info(f"SERVICE: Usuário {user_email} excluído permanentemente.")
            return {"message": "Sua conta e dados foram removidos com sucesso."}
        except Exception as e:
            db.rollback() # Garante integridade se o banco falhar
            logger.error(f"SERVICE: Erro na exclusão do usuário {current_user.id}: {str(e)}")
            raise e