from http import server
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_recovery_email(to_email: str, reset_link: str):
        # Ele vai buscar o seu e-mail e senha configurados lá na Railway
        sender_email = os.getenv("SMTP_EMAIL")
        sender_password = os.getenv("SMTP_PASSWORD")

        if not sender_email or not sender_password:
            logger.error("Credenciais de e-mail não configuradas no servidor.")
            return False

        subject = "Recuperação de Senha - JurisAI"
        
        # O visual do e-mail (HTML)
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f8f9fa;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #d4af37; text-align: center;">JurisAI</h2>
                    <p style="font-size: 16px;">Olá,</p>
                    <p style="font-size: 16px;">O administrador do sistema solicitou a redefinição da sua senha de acesso.</p>
                    <p style="font-size: 16px;">Clique no botão abaixo para ser redirecionado e criar uma nova senha:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">Se você não solicitou essa alteração, ignore este e-mail.</p>
                </div>
            </body>
        </html>
        """

        msg = MIMEMultipart()
        msg['From'] = f"JurisAI Admin <{sender_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        try:
            # Adicionado o parâmetro timeout=15 para não travar o servidor se o Google não responder rápido
            server = smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=15)
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"E-mail enviado com sucesso para: {to_email}")
            return True
        except Exception as e:
            # Esse log vai te mostrar exatamente o motivo da rejeição lá no painel da Railway
            logger.error(f"ERRO CRÍTICO NO SMTP SMTP_GMAIL: {str(e)}")
            return False