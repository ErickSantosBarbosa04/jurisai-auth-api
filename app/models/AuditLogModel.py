from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timezone
from app.core.db.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    # O ID do próprio log (esse pode ser número sequencial 1, 2, 3...)
    id = Column(Integer, primary_key=True, index=True)
    
    # A ligação com o dono do log. Arrumado para String(36) para encaixar no seu UserModel!
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # O que a pessoa fez (Ex: "Login realizado")
    action = Column(String(255), nullable=False)
    
    # Quando ela fez
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))