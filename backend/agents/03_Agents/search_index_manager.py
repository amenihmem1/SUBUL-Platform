from typing import Optional
import json
import sys as _sys
import os as _os
_AGENTS_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _AGENTS_DIR not in _sys.path:
    _sys.path.insert(0, _AGENTS_DIR)
from shared.metrics import AgentMetrics as _AgentMetrics
_metrics = _AgentMetrics("cloud-tutor")

from azure.core.credentials_async import AsyncTokenCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.models import VectorizedQuery 
from azure.search.documents.indexes.models import (
    SearchField,
    SearchFieldDataType,  
    SimpleField,
    SearchIndex,
    VectorSearch,
    VectorSearchProfile,
    HnswAlgorithmConfiguration)
from openai import AsyncAzureOpenAI
from azure.core.exceptions import ResourceNotFoundError, HttpResponseError

class SearchIndexManager:
    """
    Manager de recherche adapté SUR MESURE pour l'index de Subul.
    """
    
    def __init__(
            self,
            endpoint: str,
            credential: AsyncTokenCredential,
            index_name: str,
            dimensions: Optional[int],
            model: str,
            embeddings_client: AsyncAzureOpenAI,
        ) -> None:
        self._dimensions = dimensions
        self._index_name = index_name
        self._embeddings_client = embeddings_client
        self._endpoint = endpoint
        self._credential = credential
        self._index = None
        self._model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = SearchClient(
                endpoint=self._endpoint, index_name=self._index_name, credential=self._credential)
        return self._client

    async def search(self, message: str, course_id: Optional[str] = None, lab_slug: Optional[str] = None) -> str:
        """
        Recherche sémantique + vectorielle adaptée à l'index Subul.

        - Si `course_id` (ou `lab_slug`) est fourni, applique un filtre OData pour scoper
          la recherche sur les chunks de cette ressource.
        - Si la recherche filtrée ne retourne aucun document, on retombe sur la recherche
          globale (sans filtre) pour ne pas casser silencieusement les ressources
          pas encore réindexées.
        """
        import time
        t_start = time.time()

        # 1. Création de l'Embedding (OpenAI)
        response = await self._embeddings_client.embeddings.create(
            input=message,
            model=self._model
        )
        embedded_question = response.data[0].embedding

        t_embed = time.time()
        print(f"      -> [Search] 🟢 Embedding généré en {t_embed - t_start:.2f} secondes")

        # 2. Build optional filter
        odata_filter = None
        scope_label = None
        if course_id:
            safe = str(course_id).replace("'", "''")
            odata_filter = f"course_id eq '{safe}'"
            scope_label = f"course_id={course_id}"
        elif lab_slug:
            safe = str(lab_slug).replace("'", "''")
            odata_filter = f"course_id eq '{safe}'"
            scope_label = f"lab_slug={lab_slug}"

        async def _run_search(filter_expr):
            vector_query = VectorizedQuery(vector=embedded_question, k=5, fields="vecteur")
            kwargs = {
                "vector_queries": [vector_query],
                "select": ['texte', 'source_file'],
            }
            if filter_expr:
                kwargs["filter"] = filter_expr
            return await self._get_client().search(**kwargs)

        try:
            response_search = await _run_search(odata_filter)
            results = []
            async for result in response_search:
                source = result.get('source_file', 'Inconnu')
                texte = result.get('texte', '')
                results.append(f"[Source: {source}]\n{texte}")

            if odata_filter and not results:
                print(
                    f"      -> [Search] ⚠️ Aucun chunk pour {scope_label} — fallback recherche globale."
                )
                response_search = await _run_search(None)
                async for result in response_search:
                    source = result.get('source_file', 'Inconnu')
                    texte = result.get('texte', '')
                    results.append(f"[Source: {source}]\n{texte}")

            t_db = time.time()
            scope_msg = f" (scope {scope_label})" if scope_label else ""
            print(
                f"      -> [Search] 🔵 Azure Search{scope_msg} → {len(results)} chunks en "
                f"{t_db - t_embed:.2f}s"
            )

            _metrics.record_search_query(True)
            return "\n------\n".join(results)
        except HttpResponseError as exc:
            # Bad filter (e.g. course_id field missing on the index) → degrade gracefully.
            print(
                f"      -> [Search] ⛔ Recherche filtrée a échoué ({exc.message}). "
                f"Bascule sur recherche globale."
            )
            response_search = await _run_search(None)
            results = []
            async for result in response_search:
                source = result.get('source_file', 'Inconnu')
                texte = result.get('texte', '')
                results.append(f"[Source: {source}]\n{texte}")
            _metrics.record_search_query(bool(results))
            return "\n------\n".join(results)

    async def ensure_index_created(self, vector_index_dimensions: Optional[int] = None) -> None:
        """
        Vérifie que l'index existe (simplifié car tu l'as déjà créé avec 02_indexer_semantique.py).
        """
        exists = False
        async with SearchIndexClient(endpoint=self._endpoint, credential=self._credential) as ix_client:
            try:
                await ix_client.get_index(self._index_name)
                exists = True
                print(f"✅ [Index Manager] Index '{self._index_name}' trouvé et connecté.")
            except ResourceNotFoundError:
                print(f"⚠️ [Index Manager] Index '{self._index_name}' introuvable ! Lance d'abord 02_indexer_semantique.py")
        
    async def close(self):
        """Ferme les connexions."""
        if self._client:
            await self._client.close()