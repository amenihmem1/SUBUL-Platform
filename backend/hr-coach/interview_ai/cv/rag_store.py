from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

import faiss
import httpx
import numpy as np
from sentence_transformers import SentenceTransformer
from interview_ai.cv.profile_extractor import (
    CandidateInfo,
    extract_candidate_info,
    extract_text_from_cv,
    normalize_cv_text,
)

logger = logging.getLogger(__name__)

SessionId = str

@dataclass(frozen=True)
class SearchCandidate:
    chunk_index: int
    semantic_score: float = 0.0
    semantic_rank: int = 0

BEHAVIORAL_HINTS = frozenset({
    "situation", "exemple", "collaboration", "conflit", "equipe", "équipe",
    "team", "client", "gestion", "probleme", "problème", "difficulte",
    "difficulté", "resultat", "résultat",
})

MOTIVATION_HINTS = frozenset({
    "motivation", "pourquoi", "poste", "entreprise", "interesse", "intéressé",
    "objectif", "projet", "avenir", "carriere", "carrière", "souhaite", "rejoindre",
})

STOPWORDS = frozenset({
    "avec", "dans", "pour", "vous", "quoi", "comment", "quel", "quelle",
    "quelles", "quels", "etre", "être", "avoir", "chez", "poste", "projet",
    "cette", "cela", "plus", "tres", "très", "une", "des", "les", "and", "sur",
    "par", "aux", "ses", "son", "est", "sont", "mais", "du", "de", "la",
})

SIMPLE_STEM = {
    "developpeur": "dev",
    "developpeuse": "dev",
    "développeur": "dev",
    "développeuse": "dev",
    "developer": "dev",
    "developpement": "dev",
    "développement": "dev",
    "experience": "exp",
    "experiences": "exp",
    "expérience": "exp",
    "expériences": "exp",
    "formation": "form",
    "formations": "form",
    "education": "form",
    "competence": "skill",
    "competences": "skill",
    "compétence": "skill",
    "compétences": "skill",
    "skills": "skill",
    "projet": "proj",
    "projets": "proj",
    "project": "proj",
    "ingenieur": "ing",
    "ingénieur": "ing",
    "engineer": "ing",
    "architecte": "arch",
}

SECTION_PATTERN = re.compile(
    r"^(Experience|Expérience|Experiences|Expériences|Parcours professionnel|"
    r"Formation|Formations|Education|Éducation|Competences|Compétences|Skills|"
    r"Langues|Projets|Certifications|Centres?\s*d['’]?(interet|intérêt)|"
    r"Loisirs|Informations complementaires|Informations complémentaires)\b.*$",
    re.IGNORECASE | re.MULTILINE,
)

class CVRAGStore:
    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        chunk_size: int = 480,
        chunk_overlap: int = 100,
        embed_batch_size: int = 64,
        retrieval_multiplier: int = 3,
        session_ttl_minutes: int = 120,
    ) -> None:
        if chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValueError("chunk_size / overlap invalides")

        self.model_name = model_name
        self.model: SentenceTransformer | None = None
        self.dim: int | None = None

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embed_batch_size = embed_batch_size
        self.retrieval_multiplier = max(1, retrieval_multiplier)
        self.session_ttl = timedelta(minutes=max(1, session_ttl_minutes))

        self._sessions: dict[SessionId, dict[str, Any]] = {}
        self._last_access: dict[SessionId, datetime] = {}

    def _touch(self, sid: SessionId) -> None:
        self._last_access[sid] = datetime.now()

    def expire_old_sessions(self) -> list[SessionId]:
        now = datetime.now()
        expired = [
            sid for sid, ts in self._last_access.items()
            if now - ts > self.session_ttl
        ]
        for sid in expired:
            self.clear_session(sid)
        return expired

    def clear_session(self, sid: SessionId) -> None:
        self._sessions.pop(sid, None)
        self._last_access.pop(sid, None)
        logger.info("Session supprimee : %s", sid)

    def ingest_cv(self, session_id: SessionId, filename: str, content: bytes) -> dict[str, Any]:
        self.expire_old_sessions()

        raw_text = extract_text_from_cv(filename, content, logger=logger)
        clean_text = normalize_cv_text(raw_text)

        if not clean_text:
            raise ValueError("Aucun texte extrait du CV")

        chunks = self._smart_chunk(clean_text)
        if not chunks:
            raise ValueError("Aucun chunk valide")

        profile = extract_candidate_info(clean_text, filename)
        embeddings = self._embed_chunks(chunks)
        index = self._build_index(embeddings)

        self._sessions[session_id] = {
            "chunks": chunks,
            "embeddings": embeddings,
            "index": index,
            "profile": profile,
        }
        self._touch(session_id)

        logger.info("CV ingere - session=%s | chunks=%d", session_id, len(chunks))

        return {
            "filename": filename,
            "chunk_count": len(chunks),
            "profile": profile.__dict__,
            "status": "ingested",
        }

    def retrieve_context(self, session_id: SessionId, query: str, top_k: int = 5) -> list[str]:
        session = self._sessions.get(session_id)
        if session is None:
            logger.info("Session inconnue : %s", session_id)
            return []

        self._touch(session_id)

        chunks = session["chunks"]
        top_k = max(1, min(top_k, len(chunks)))
        pool_size = min(len(chunks), top_k * self.retrieval_multiplier)

        query_emb = self._encode(query)
        semantic_hits = self._semantic_search(session, query_emb, pool_size)
        if not semantic_hits:
            return []

        reranked = self._rerank(
            session=session,
            query=query,
            query_emb=query_emb,
            candidates=semantic_hits,
        )
        return [chunks[candidate.chunk_index] for candidate in reranked[:top_k]]

    def get_profile(self, session_id: SessionId) -> CandidateInfo | dict[str, Any]:
        session = self._sessions.get(session_id)
        if session is None:
            return {}
        self._touch(session_id)
        return session["profile"]

    def _encode(self, text: str) -> np.ndarray:
        self._ensure_model()
        if self.model is None:
            raise RuntimeError(f"Echec chargement modele {self.model_name}")
        embedding = self.model.encode(text, normalize_embeddings=True)
        return np.asarray(embedding, dtype=np.float32).reshape(1, -1)

    def _embed_chunks(self, chunks: list[str]) -> np.ndarray:
        self._ensure_model()
        if self.model is None:
            raise RuntimeError(f"Echec chargement modele {self.model_name}")
        embeddings = self.model.encode(
            chunks,
            batch_size=self.embed_batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return np.asarray(embeddings, dtype=np.float32)

    def _build_index(self, embeddings: np.ndarray) -> faiss.Index:
        dim = self.dim or int(embeddings.shape[1])
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        return index

    def _ensure_model(self) -> None:
        if self.model is not None:
            return
        try:
            self.model = SentenceTransformer(self.model_name)
            self.dim = self.model.get_sentence_embedding_dimension()
        except Exception as exc:
            raise RuntimeError(f"Echec chargement modele {self.model_name}") from exc

    def _semantic_search(
        self,
        session: dict[str, Any],
        q_emb: np.ndarray,
        k: int,
    ) -> list[SearchCandidate]:
        index: faiss.Index = session["index"]
        scores, ids = index.search(q_emb, k)

        return [
            SearchCandidate(
                chunk_index=int(idx),
                semantic_score=float(score),
                semantic_rank=rank + 1,
            )
            for rank, (idx, score) in enumerate(zip(ids[0], scores[0]))
            if 0 <= idx < len(session["chunks"])
        ]

    def _rerank(
        self,
        *,
        session: dict[str, Any],
        query: str,
        query_emb: np.ndarray,
        candidates: list[SearchCandidate],
    ) -> list[SearchCandidate]:
        if not candidates:
            return []

        chunks = session["chunks"]
        embeddings = session["embeddings"]
        query_tokens = self._tokenize(query)
        query_lower = query.lower()

        scored: list[tuple[float, SearchCandidate]] = []

        for candidate in candidates:
            idx = candidate.chunk_index
            chunk = chunks[idx]
            chunk_vec = embeddings[idx].reshape(1, -1)

            cos_sim = float(np.dot(query_emb, chunk_vec.T)[0][0])
            cos_norm = (cos_sim + 1) / 2

            lexical = self._lexical_score(query_tokens, chunk)
            phrase = self._phrase_score(query, chunk)
            domain = self._domain_bonus(query_lower, chunk.lower())

            final_score = (
                cos_norm * 0.72 +
                lexical * 0.14 +
                phrase * 0.08 +
                domain * 0.06
            )
            scored.append((final_score, candidate))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [candidate for _, candidate in scored]

    def _lexical_score(self, query_tokens: set[str], chunk: str) -> float:
        if not query_tokens:
            return 0.0
        chunk_tokens = self._tokenize(chunk)
        return len(query_tokens & chunk_tokens) / len(query_tokens)

    def _phrase_score(self, query: str, chunk: str) -> float:
        terms = re.findall(r"[A-Za-zÀ-ÿ]{4,}", query.lower())
        if not terms:
            return 0.0
        chunk_lower = chunk.lower()
        return sum(term in chunk_lower for term in terms) / len(terms)

    def _domain_bonus(self, query_lower: str, chunk_lower: str) -> float:
        bonus = 0.0
        if any(hint in query_lower for hint in BEHAVIORAL_HINTS) and any(hint in chunk_lower for hint in BEHAVIORAL_HINTS):
            bonus += 0.5
        if any(hint in query_lower for hint in MOTIVATION_HINTS) and any(hint in chunk_lower for hint in MOTIVATION_HINTS):
            bonus += 0.5
        return bonus

    def _smart_chunk(self, text: str) -> list[str]:
        chunks: list[str] = []
        for section in self._split_sections(text):
            chunks.extend(self._chunk_section(section))
        return [chunk.strip() for chunk in chunks if len(chunk.strip()) >= 40]

    def _split_sections(self, text: str) -> list[str]:
        lines = [line.strip() for line in text.splitlines()]
        sections: list[str] = []
        current: list[str] = []

        for line in lines:
            if not line:
                continue
            if SECTION_PATTERN.match(line):
                if current:
                    sections.append("\n".join(current).strip())
                current = [line]
            else:
                current.append(line)

        if current:
            sections.append("\n".join(current).strip())

        return [section for section in sections if section]

    def _chunk_section(self, text: str) -> list[str]:
        if len(text) <= self.chunk_size:
            return [text]

        chunks: list[str] = []
        current = ""

        for sentence in re.split(r"(?<=[\.\!\?\:])\s+", text):
            sentence = sentence.strip()
            if not sentence:
                continue

            candidate = f"{current} {sentence}".strip() if current else sentence
            if len(candidate) <= self.chunk_size:
                current = candidate
                continue

            if current:
                chunks.append(current)

            if len(sentence) <= self.chunk_size:
                current = sentence
            else:
                chunks.extend(self._split_long_sentence(sentence))
                current = ""

        if current:
            chunks.append(current)

        return chunks

    def _split_long_sentence(self, sentence: str) -> list[str]:
        pieces: list[str] = []
        start = 0

        while start < len(sentence):
            end = min(start + self.chunk_size, len(sentence))
            piece = sentence[start:end].strip()
            if piece:
                pieces.append(piece)
            if end >= len(sentence):
                break
            start = end - self.chunk_overlap

        return pieces

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r"[A-Za-zÀ-ÿ]{3,}", text.lower())
        return {
            SIMPLE_STEM.get(word, word)
            for word in words
            if word not in STOPWORDS
        }

if __name__ == "__main__":
    print("Module CV RAG - version restructuree")


class AzureSearchCVRAGStore(CVRAGStore):
    """CV RAG store backed by Azure AI Search, with local FAISS fallback."""

    def __init__(
        self,
        *,
        endpoint: str,
        api_key: str,
        index_name: str,
        api_version: str = "2024-07-01",
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.azure_endpoint = endpoint.rstrip("/")
        self.azure_api_key = api_key
        self.azure_index_name = index_name
        self.azure_api_version = api_version
        self._azure_index_ready = False

    def ingest_cv(self, session_id: SessionId, filename: str, content: bytes) -> dict[str, Any]:
        result = super().ingest_cv(session_id, filename, content)
        session = self._sessions.get(session_id)
        if not session:
            return result

        try:
            self._ensure_azure_index()
            self._upload_azure_chunks(
                session_id=session_id,
                filename=filename,
                chunks=session["chunks"],
            )
            result["search_backend"] = "azure"
            result["azure_search_index"] = self.azure_index_name
        except Exception as exc:
            logger.warning("Azure Search ingestion skipped session=%s error=%s", session_id, exc)
            result["search_backend"] = "local_fallback"
            result["azure_search_error"] = str(exc)
        return result

    def retrieve_context(self, session_id: SessionId, query: str, top_k: int = 5) -> list[str]:
        try:
            self._ensure_azure_index()
            hits = self._search_azure_chunks(session_id=session_id, query=query, top_k=top_k)
            if hits:
                return hits
        except Exception as exc:
            logger.warning("Azure Search retrieval fallback session=%s error=%s", session_id, exc)
        return super().retrieve_context(session_id, query, top_k)

    def clear_session(self, sid: SessionId) -> None:
        try:
            self._delete_azure_session(sid)
        except Exception as exc:
            logger.warning("Azure Search cleanup skipped session=%s error=%s", sid, exc)
        super().clear_session(sid)

    def _headers(self) -> dict[str, str]:
        return {
            "api-key": self.azure_api_key,
            "Content-Type": "application/json",
        }

    def _index_url(self) -> str:
        return f"{self.azure_endpoint}/indexes/{self.azure_index_name}"

    def _docs_url(self, suffix: str) -> str:
        return f"{self.azure_endpoint}/indexes/{self.azure_index_name}/docs/{suffix}"

    def _ensure_azure_index(self) -> None:
        if self._azure_index_ready:
            return

        response = httpx.get(
            self._index_url(),
            params={"api-version": self.azure_api_version},
            headers=self._headers(),
            timeout=15.0,
        )
        if response.status_code == 404:
            self._create_azure_index()
        else:
            response.raise_for_status()
        self._azure_index_ready = True

    def _create_azure_index(self) -> None:
        payload = {
            "name": self.azure_index_name,
            "fields": [
                {"name": "id", "type": "Edm.String", "key": True, "filterable": True},
                {"name": "session_id", "type": "Edm.String", "filterable": True},
                {"name": "filename", "type": "Edm.String", "searchable": True, "filterable": True},
                {"name": "chunk_index", "type": "Edm.Int32", "filterable": True, "sortable": True},
                {"name": "content", "type": "Edm.String", "searchable": True},
                {"name": "created_at", "type": "Edm.DateTimeOffset", "filterable": True, "sortable": True},
            ],
        }
        response = httpx.post(
            f"{self.azure_endpoint}/indexes",
            params={"api-version": self.azure_api_version},
            headers=self._headers(),
            json=payload,
            timeout=20.0,
        )
        response.raise_for_status()
        logger.info("Azure Search index created: %s", self.azure_index_name)

    def _upload_azure_chunks(self, *, session_id: SessionId, filename: str, chunks: list[str]) -> None:
        now = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        docs = [
            {
                "@search.action": "mergeOrUpload",
                "id": self._azure_doc_id(session_id, index),
                "session_id": session_id,
                "filename": filename,
                "chunk_index": index,
                "content": chunk,
                "created_at": now,
            }
            for index, chunk in enumerate(chunks)
        ]
        for start in range(0, len(docs), 100):
            response = httpx.post(
                self._docs_url("index"),
                params={"api-version": self.azure_api_version},
                headers=self._headers(),
                json={"value": docs[start : start + 100]},
                timeout=30.0,
            )
            response.raise_for_status()

        deadline = time.time() + 6.0
        while time.time() < deadline:
            if self._search_azure_chunks(session_id=session_id, query="*", top_k=1):
                return
            time.sleep(0.5)

    def _search_azure_chunks(self, *, session_id: SessionId, query: str, top_k: int) -> list[str]:
        response = httpx.post(
            self._docs_url("search"),
            params={"api-version": self.azure_api_version},
            headers=self._headers(),
            json={
                "search": query.strip() or "*",
                "filter": f"session_id eq '{self._escape_filter_value(session_id)}'",
                "top": max(1, top_k),
                "select": "content,chunk_index",
                "orderby": "search.score() desc, chunk_index asc",
            },
            timeout=15.0,
        )
        response.raise_for_status()
        items = response.json().get("value", [])
        return [
            str(item.get("content", "")).strip()
            for item in items
            if isinstance(item, dict) and str(item.get("content", "")).strip()
        ]

    def _delete_azure_session(self, session_id: SessionId) -> None:
        self._ensure_azure_index()
        docs = [
            {"@search.action": "delete", "id": self._azure_doc_id(session_id, index)}
            for index in range(1000)
        ]
        for start in range(0, len(docs), 100):
            response = httpx.post(
                self._docs_url("index"),
                params={"api-version": self.azure_api_version},
                headers=self._headers(),
                json={"value": docs[start : start + 100]},
                timeout=20.0,
            )
            response.raise_for_status()

    @staticmethod
    def _azure_doc_id(session_id: SessionId, chunk_index: int) -> str:
        safe_session = re.sub(r"[^A-Za-z0-9_-]+", "-", session_id).strip("-") or "session"
        return f"{safe_session}-{chunk_index}"

    @staticmethod
    def _escape_filter_value(value: str) -> str:
        return str(value).replace("'", "''")
