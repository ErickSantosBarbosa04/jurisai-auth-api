import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path


@dataclass
class LegalChunk:
    title: str
    file: str
    text: str
    score: float = 0.0


class RAGService:
    ROOT_DIR = Path(__file__).resolve().parents[2]
    LEGAL_DATA_DIR = ROOT_DIR / "data" / "legal"
    MAX_EXCERPT_CHARS = 520

    STOPWORDS = {
        "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos",
        "e", "em", "entre", "era", "essa", "esse", "esta", "este", "eu", "foi",
        "ha", "isso", "ja", "mais", "mas", "me", "minha", "meu", "na", "nas",
        "no", "nos", "o", "os", "ou", "para", "pela", "pelo", "por", "qual",
        "que", "se", "sem", "ser", "sua", "um", "uma", "voce",
    }

    @classmethod
    def find_relevant_chunks(cls, question: str, top_k: int = 4) -> list[LegalChunk]:
        chunks = cls._load_chunks()
        if not chunks:
            return []

        query_terms = cls._tokenize(question)
        if not query_terms:
            return []

        scored_chunks = []
        query_set = set(query_terms)
        for chunk in chunks:
            text_terms = cls._tokenize(f"{chunk.title} {chunk.text}")
            if not text_terms:
                continue

            text_set = set(text_terms)
            overlap = query_set.intersection(text_set)
            density = len(overlap) / max(len(query_set), 1)
            frequency = sum(text_terms.count(term) for term in overlap)
            title_boost = sum(1 for term in overlap if term in cls._tokenize(chunk.title)) * 0.8
            chunk.score = round(density + (frequency * 0.08) + title_boost, 4)
            scored_chunks.append(chunk)

        ranked = sorted(scored_chunks, key=lambda item: item.score, reverse=True)
        relevant = [chunk for chunk in ranked if chunk.score > 0]
        return cls._diversify_by_file(relevant, top_k)

    @classmethod
    def build_context(cls, chunks: list[LegalChunk]) -> str:
        if not chunks:
            return (
                "Nenhuma fonte juridica local foi encontrada. Responda com cautela "
                "e avise que a base academica precisa ser ampliada."
            )

        context_blocks = []
        for index, chunk in enumerate(chunks, start=1):
            excerpt = cls._excerpt(chunk.text, limit=1400)
            context_blocks.append(
                f"Fonte {index}: {chunk.title} ({chunk.file})\n{excerpt}"
            )
        return "\n\n".join(context_blocks)

    @classmethod
    def to_source_payload(cls, chunks: list[LegalChunk]) -> list[dict]:
        return [
            {
                "title": chunk.title,
                "file": chunk.file,
                "excerpt": cls._excerpt(chunk.text),
                "score": chunk.score,
            }
            for chunk in chunks
        ]

    @classmethod
    def _load_chunks(cls) -> list[LegalChunk]:
        if not cls.LEGAL_DATA_DIR.exists():
            return []

        chunks = []
        for path in sorted(cls.LEGAL_DATA_DIR.glob("*.md")):
            content = path.read_text(encoding="utf-8").strip()
            if not content:
                continue

            title = cls._extract_title(content, path)
            sections = cls._split_sections(content)
            for section in sections:
                section_text = cls._strip_heading(section).strip()
                if len(section_text) < 80:
                    continue
                chunks.append(LegalChunk(title=title, file=path.name, text=section_text))
        return chunks

    @staticmethod
    def _diversify_by_file(chunks: list[LegalChunk], top_k: int) -> list[LegalChunk]:
        selected = []
        seen_files = set()

        for chunk in chunks:
            if chunk.file in seen_files:
                continue
            selected.append(chunk)
            seen_files.add(chunk.file)
            if len(selected) >= top_k:
                break

        return selected

    @staticmethod
    def _extract_title(content: str, path: Path) -> str:
        for line in content.splitlines():
            if line.startswith("# "):
                return line.replace("#", "", 1).strip()
        return path.stem.replace("_", " ").title()

    @staticmethod
    def _split_sections(content: str) -> list[str]:
        sections = re.split(r"\n(?=##\s+)", content)
        if len(sections) <= 1:
            paragraphs = [part.strip() for part in content.split("\n\n") if part.strip()]
            return paragraphs or [content]
        return sections

    @staticmethod
    def _strip_heading(text: str) -> str:
        lines = [line for line in text.splitlines() if not line.strip().startswith("#")]
        return "\n".join(lines)

    @classmethod
    def _tokenize(cls, text: str) -> list[str]:
        normalized = unicodedata.normalize("NFKD", text.lower())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        words = re.findall(r"[a-z0-9]{3,}", normalized)
        return [word for word in words if word not in cls.STOPWORDS]

    @classmethod
    def _excerpt(cls, text: str, limit: int | None = None) -> str:
        compact = re.sub(r"\s+", " ", text).strip()
        max_chars = limit or cls.MAX_EXCERPT_CHARS
        if len(compact) <= max_chars:
            return compact
        return f"{compact[:max_chars].rsplit(' ', 1)[0]}..."
