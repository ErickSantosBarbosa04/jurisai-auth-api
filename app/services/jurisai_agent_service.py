from app.services.debate_service import DebateService
from app.services.llm_service import LLMService
from app.services.prompt_guard_service import PromptGuardService
from app.services.rag_service import RAGService


class JurisAIAgentService:
    """Orquestra guarda de escopo, RAG juridico e geracao da resposta."""

    @classmethod
    def answer(
        cls,
        question: str,
        mode: str,
        history: list,
        user_profile: dict,
    ) -> dict:
        guard = PromptGuardService.evaluate(question, history)
        if not guard.allowed:
            return cls._blocked_response(guard, mode)

        safe_question = guard.cleaned_text or PromptGuardService.sanitize_user_text(question)
        safe_history = PromptGuardService.sanitize_history(history)
        rag_query = PromptGuardService.build_rag_query(safe_question, safe_history)
        if guard.code == "contextual_follow_up":
            rag_query = PromptGuardService.build_contextual_query(safe_question, safe_history)

        chunks = RAGService.find_relevant_chunks(rag_query)
        context = RAGService.build_context(chunks)

        llm_result = LLMService.generate_answer(
            question=safe_question,
            mode=mode,
            context=context,
            history=safe_history,
            user_profile=user_profile,
        )

        debate_score = DebateService.evaluate(safe_question, chunks) if mode == "debate" else None

        return {
            "answer": llm_result["answer"],
            "mode": mode,
            "sources": RAGService.to_source_payload(chunks),
            "provider": llm_result["provider"],
            "model": llm_result["model"],
            "debate_score": debate_score,
            "disclaimer": (
                "Uso academico. A resposta nao substitui orientacao de advogado "
                "ou professor."
            ),
        }

    @staticmethod
    def _blocked_response(guard, mode: str) -> dict:
        return {
            "answer": guard.message,
            "mode": mode,
            "sources": [],
            "provider": "jurisai-guard",
            "model": guard.code,
            "debate_score": None,
            "disclaimer": PromptGuardService.DISCLAIMER,
        }
