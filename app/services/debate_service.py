import re
import unicodedata


class DebateService:
    STRONG_TERMS = {
        "artigo", "cdc", "oferta", "prova", "nexo", "dano", "vicio",
        "responsabilidade", "solidaria", "abusiva", "falha", "contrato",
        "publicidade", "devolucao", "restituicao", "fornecedor",
        "culpa", "dolo", "tipicidade", "ilicitude", "competencia", "pedido",
        "fundamento", "prescricao", "decadencia", "lancamento", "subordinacao",
        "carencia", "segurado", "proporcionalidade", "legalidade", "finalidade",
    }
    WEAK_TERMS = {
        "acho", "talvez", "nao sei", "sem prova", "parece", "pode ser",
        "porque eu quero", "so quero", "nao tenho prova", "nao quero explicar",
        "nao sei explicar", "culpa dela", "tem que pagar", "nao precisa",
    }
    EVIDENCE_TERMS = {
        "nota", "fiscal", "print", "prints", "video", "videos", "documento",
        "protocolo", "email", "mensagem", "laudo", "comprovante", "contrato",
        "testemunha", "foto", "fotos", "prova",
    }
    LEGAL_REASONING_TERMS = {
        "artigo", "cdc", "codigo", "lei", "fornecedor", "responsabilidade",
        "solidaria", "objetiva", "nexo", "prazo", "garantia", "vicio",
        "restituicao", "devolucao", "troca", "pedido", "fundamento",
    }
    BAD_PATTERNS = (
        r"\bporque eu quero\b",
        r"\bso quero\b",
        r"\bnao tenho prova\b",
        r"\bnao sei\b",
        r"\bnao quero explicar\b",
        r"\bnao preciso explicar\b",
        r"\bela esta errada\b",
        r"\btem que (pagar|devolver)\b",
        r"\bproblema nao e meu\b",
        r"\bdata voce nao precisa\b",
    )

    @classmethod
    def evaluate(cls, question: str, chunks: list) -> dict:
        text = cls._normalize(question)
        words = set(re.findall(r"[a-z0-9]{3,}", text))

        source_score = min(8, len(chunks) * 2)
        argument_score = min(24, sum(3 for term in cls.STRONG_TERMS if term in words or term in text))
        evidence_score = min(16, sum(4 for term in cls.EVIDENCE_TERMS if term in words or term in text))
        legal_reasoning_score = min(
            20,
            sum(3 for term in cls.LEGAL_REASONING_TERMS if term in words or term in text),
        )
        structure_score = 0

        if "porque" in words or "pois" in words:
            structure_score += 4
        if "defendo" in words or "tese" in words:
            structure_score += 4
        if "contraponto" in words or "defesa" in words:
            structure_score += 5
        if len(words) >= 28:
            structure_score += 5
        if any(term in words for term in {"fato", "fundamento", "pedido"}):
            structure_score += 4
        structure_score = min(17, structure_score)

        risk_penalty = cls._risk_penalty(text, words)
        base_score = 18
        raw_percent = (
            base_score
            + source_score
            + argument_score
            + evidence_score
            + legal_reasoning_score
            + structure_score
            - risk_penalty
        )
        percent = max(8, min(96, raw_percent))

        return {
            "percent": percent,
            "label": cls._label(percent),
            "reason": cls._reason(
                percent,
                source_score,
                argument_score,
                structure_score,
                risk_penalty,
                evidence_score,
                legal_reasoning_score,
            ),
        }

    @staticmethod
    def _label(percent: int) -> str:
        if percent >= 85:
            return "Tese muito forte"
        if percent >= 70:
            return "Tese forte"
        if percent >= 55:
            return "Tese defensavel"
        if percent >= 35:
            return "Tese fraca"
        return "Tese fragil"

    @classmethod
    def _risk_penalty(cls, text: str, words: set[str]) -> int:
        weak_penalty = sum(6 for term in cls.WEAK_TERMS if term in text)
        bad_pattern_penalty = sum(10 for pattern in cls.BAD_PATTERNS if re.search(pattern, text))
        short_penalty = 0

        if len(words) < 8:
            short_penalty += 18
        elif len(words) < 16:
            short_penalty += 10

        missing_evidence_penalty = 0
        if not any(term in words or term in text for term in cls.EVIDENCE_TERMS):
            missing_evidence_penalty += 12
        if not any(term in words or term in text for term in cls.LEGAL_REASONING_TERMS):
            missing_evidence_penalty += 12

        return min(55, weak_penalty + bad_pattern_penalty + short_penalty + missing_evidence_penalty)

    @classmethod
    def _reason(
        cls,
        percent: int,
        source_score: int,
        argument_score: int,
        structure_score: int,
        risk_penalty: int,
        evidence_score: int,
        legal_reasoning_score: int,
    ) -> str:
        if percent >= 70:
            return (
                "Boa chance academica porque a resposta apresenta fundamento, prova "
                "e estrutura minima para sustentar a tese."
            )
        if risk_penalty:
            return (
                "A tese perdeu forca por resposta vaga ou insuficiente. Indique prova, "
                "fundamento juridico, prazo e pedido em vez de apenas afirmar que a "
                "outra parte esta errada."
            )
        if evidence_score < 6 or legal_reasoning_score < 6:
            return (
                "A tese ainda esta pouco fundamentada. Cite prova concreta, base legal "
                "e explique o nexo entre o fato e a responsabilidade alegada."
            )
        return (
            "A tese e plausivel, mas pode melhorar se voce antecipar a defesa da parte "
            "contraria e responder ao principal contraponto."
        )

    @staticmethod
    def _normalize(text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text.lower())
        return "".join(char for char in normalized if not unicodedata.combining(char))
