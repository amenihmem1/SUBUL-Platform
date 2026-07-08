# Multi-stage Dockerfile for AI Agents (Quiz, Roadmap, CV Booster, Coach, Job Search)
# Override base image if Docker Hub is unreachable: docker build --build-arg BASE_IMAGE=your-mirror/python:3.11-slim
# Uses BuildKit cache mounts for pip; enable with DOCKER_BUILDKIT=1 (default in recent Docker).
ARG BASE_IMAGE=python:3.11-slim
FROM ${BASE_IMAGE} AS base

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Install system dependencies (minimal for smaller image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Base configuration for quiz, roadmap, coach, cloud-tutor only (no CV Booster: avoids torch/nvidia_cublas)
COPY quiz_Agent/requirements.txt /tmp/quiz-requirements.txt
COPY roadmap_Agent/requirements.txt /tmp/roadmap-requirements.txt
COPY coach_Agent/requirements.txt /tmp/coach-requirements.txt
COPY 03_Agents/requirements.txt /tmp/03-requirements.txt

# Create combined requirements file (no job-search, no cv-booster to keep base small and fast)
RUN cat /tmp/quiz-requirements.txt /tmp/roadmap-requirements.txt /tmp/coach-requirements.txt /tmp/03-requirements.txt | \
    sort | uniq > /tmp/requirements.txt

# Install Python dependencies (long timeout for slow networks); cache mount speeds rebuilds
ENV PIP_DEFAULT_TIMEOUT=300
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# ----------------- CV Booster base (sentence-transformers + CPU-only PyTorch; isolated to avoid bloating other agents)
ARG BASE_IMAGE
FROM ${BASE_IMAGE} AS base-cv
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libssl-dev curl \
    && rm -rf /var/lib/apt/lists/*
ENV PIP_DEFAULT_TIMEOUT=300
# CPU-only PyTorch (avoid CUDA bloat)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY CV_Booster_Agent/requirements.txt /tmp/cv-requirements.txt
RUN pip install --no-cache-dir -r /tmp/cv-requirements.txt
# Pre-download the sentence-transformers model at build time so the container
# does not need internet access at runtime (Docker network may block huggingface.co).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" \
    || echo "⚠️  Model pre-download failed (no internet at build time) — will retry at runtime."



# ----------------- Quiz Agent Stage -----------------
FROM base AS quiz-agent
COPY shared/ /app/shared/
COPY quiz_Agent/ /app/
ENV PYTHONPATH=/app
ENV AGENT_TYPE=quiz
ENV AZURE_OPENAI_ENDPOINT="https://quizinstance.openai.azure.com/"
ENV AZURE_OPENAI_API_KEY="4IZWED0kCNgAw6KjAbNOUmWARXZTMiDPSv54z1N0r2X2Nxe25nZtJQQJ99CCACHYHv6XJ3w3AAABACOGPj9t"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
ENV AZURE_SEARCH_ENDPOINT="https://search-tuteur-subul-skander.search.windows.net"
ENV AZURE_SEARCH_API_KEY="4XDUG1sGXyagwOeQ5BDaE0VDTMzJX0T7LmoKyI70PFAzSeC0GyCu"
ENV AZURE_SEARCH_INDEX_NAME="index-subul-semantic-v2"
ENV AZURE_COSMOS_ENDPOINT="https://cosmosdbtutot.documents.azure.com:443/"
ENV AZURE_COSMOS_KEY="HIDGG5hzdItrc78CAxzZOyOwBIiqzhsaQuTCh4BH0V5wpqGKY6T5TbBp7oQi5N8VBAuxpPgnEE0UACDbH8fLEw=="
ENV AZURE_COSMOS_DATABASE_NAME="EduTech_AI_Production"
ENV AZURE_COSMOS_CONTAINER_NAME="AgentQuiz"
ENV AZURE_COSMOS_QUIZ_CONTAINER_NAME="AgentQuiz"
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/api/quiz/health || exit 1
CMD ["python", "-m", "uvicorn", "quiz_api_server:app", "--host", "0.0.0.0", "--port", "8001"]

# ----------------- Roadmap Agent Stage -----------------
FROM base AS roadmap-agent
COPY shared/ /app/shared/
COPY roadmap_Agent/ /app/
ENV PYTHONPATH=/app
ENV AGENT_TYPE=roadmap
ENV AZURE_OPENAI_ENDPOINT="https://roadmapia.openai.azure.com/"
ENV AZURE_OPENAI_API_KEY="7xhOrdQsq1VEMsjqocrsld8attZMkijU31DzfUPj8pIZOFWnfoYaJQQJ99CCACHYHv6XJ3w3AAABACOGYv8r"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
ENV AZURE_SEARCH_ENDPOINT="https://search-tuteur-subul-skander.search.windows.net"
ENV AZURE_SEARCH_API_KEY="4XDUG1sGXyagwOeQ5BDaE0VDTMzJX0T7LmoKyI70PFAzSeC0GyCu"
ENV AZURE_SEARCH_INDEX_NAME="index-subul-semantic-v2"
ENV AZURE_AI_EMBED_DIMENSIONS="1536"
ENV AZURE_COSMOS_ENDPOINT="https://cosmosdbtutot.documents.azure.com:443/"
ENV AZURE_COSMOS_KEY="HIDGG5hzdItrc78CAxzZOyOwBIiqzhsaQuTCh4BH0V5wpqGKY6T5TbBp7oQi5N8VBAuxpPgnEE0UACDbH8fLEw=="
ENV AZURE_COSMOS_DATABASE_NAME="EduTech_AI_Production"
ENV AZURE_COSMOS_ROADMAP_CONTAINER_NAME="AgentRoadmap"
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/api/roadmap/health || exit 1
CMD ["python", "-m", "uvicorn", "roadmap_api_server:app", "--host", "0.0.0.0", "--port", "8002"]

# ----------------- Coach Agent Stage -----------------
FROM base AS coach-agent
COPY shared/ /app/shared/
COPY coach_Agent/ /app/
ENV PYTHONPATH=/app
ENV AGENT_TYPE=coach
ENV AZURE_OPENAI_ENDPOINT="https://openaiaccompagnement.openai.azure.com"
ENV AZURE_OPENAI_API_KEY="EQcCbrBrhAPZuxlMAkMTTNHmi7fvB1z15GV9Yya4bmvX2bQkU49mJQQJ99CBACHYHv6XJ3w3AAABACOG2qwj"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_API_VERSION="2024-12-01-preview"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
ENV AZURE_SEARCH_ENDPOINT="https://search-tuteur-subul-skander.search.windows.net"
ENV AZURE_SEARCH_API_KEY="4XDUG1sGXyagwOeQ5BDaE0VDTMzJX0T7LmoKyI70PFAzSeC0GyCu"
ENV AZURE_SEARCH_INDEX_NAME="indexaccompagningagent"
ENV DEEPGRAM_API_KEY="a35f27d320751cd79947fa0541196998df5cb993"
ENV AZURE_COSMOS_ENDPOINT="https://cosmosdbtutot.documents.azure.com:443/"
ENV AZURE_COSMOS_KEY="HIDGG5hzdItrc78CAxzZOyOwBIiqzhsaQuTCh4BH0V5wpqGKY6T5TbBp7oQi5N8VBAuxpPgnEE0UACDbH8fLEw=="
ENV AZURE_COSMOS_DATABASE_NAME="EduTech_AI_Production"
ENV AZURE_COSMOS_CONTAINER_NAME="AccompanyingSessions"
ENV CARTESIA_API_KEY="sk_car_aQJuuV1BBJFZ26Xhbur6Cz"
EXPOSE 8004
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8004/api/coach/health || exit 1
CMD ["python", "-m", "uvicorn", "api_coach:app", "--host", "0.0.0.0", "--port", "8004"]

# ----------------- 03 Agents (Cloud Tutor) Stage -----------------
FROM base AS cloud-tutor-agent
COPY shared/ /app/shared/
COPY 03_Agents/ /app/
ENV PYTHONPATH=/app
ENV AGENT_TYPE=cloud-tutor
ENV AZURE_OPENAI_ENDPOINT="https://oai-subul-tuteur-dev.openai.azure.com/"
ENV AZURE_OPENAI_API_KEY="AtUsLTTtFlNA1cBoSprUS5UNX50PUDtHDJ7orkCrCsjoULxkiX2PJQQJ99CBACHYHv6XJ3w3AAABACOGagoi"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4o"
ENV AZURE_OPENAI_API_VERSION="2024-12-01-preview"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small-2"
ENV AZURE_SEARCH_ENDPOINT="https://search-tuteur-subul-skander.search.windows.net"
ENV AZURE_SEARCH_API_KEY="4XDUG1sGXyagwOeQ5BDaE0VDTMzJX0T7LmoKyI70PFAzSeC0GyCu"
ENV AZURE_SEARCH_INDEX_NAME="index-subul-semantic-v2"
ENV AZURE_STORAGE_ACCOUNT_NAME="skanderstorage2026"
ENV AZURE_STORAGE_ACCOUNT_KEY="E+RnzkmrkJaoY7wO+hjPKd+naZi6VxUTjaYbV2WhrHVRBK7qW/H5WGlB99oxuQKy1874l2SFDJE8+AStb5HENA>"
ENV AZURE_BLOB_CONTAINER="agent-tutor-stockage-artifacts"
ENV VITE_DEEPGRAM_API_KEY="a35f27d320751cd79947fa0541196998df5cb993"
ENV DEEPGRAM_API_KEY="a35f27d320751cd79947fa0541196998df5cb993"
ENV CARTESIA_API_KEY="sk_car_aQJuuV1BBJFZ26Xhbur6Cz"
ENV AZURE_COSMOS_ENDPOINT="https://cosmosdbtutot.documents.azure.com:443/"
ENV AZURE_COSMOS_KEY="HIDGG5hzdItrc78CAxzZOyOwBIiqzhsaQuTCh4BH0V5wpqGKY6T5TbBp7oQi5N8VBAuxpPgnEE0UACDbH8fLEw=="
ENV AZURE_COSMOS_DATABASE_NAME="EduTech_AI_Production"
ENV AZURE_COSMOS_CONTAINER_NAME="AgentTutor"
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/openapi.json || exit 1
CMD ["python", "-m", "uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]

# ----------------- CV Booster Agent Stage -----------------
FROM base-cv AS cv-booster-agent
COPY shared/ /app/shared/
# enhance_cv.py adds parent/JobSearch-SUBUL to sys.path → files must live at /JobSearch-SUBUL/.
COPY JobSearch-SUBUL/cv_extraction.py JobSearch-SUBUL/explain_ats.py JobSearch-SUBUL/db_platform.py /JobSearch-SUBUL/
COPY CV_Booster_Agent/ /app/
ENV PYTHONPATH=/app
ENV AGENT_TYPE=cv-booster
ENV AZURE_OPENAI_ENDPOINT="https://cvazureopenai.openai.azure.com/"
ENV AZURE_OPENAI_API_KEY="Eettc4PUxKZRrmWLehzjtxrmaKuv8ExnqrQhmJL4bap5cppyTUt5JQQJ99CCACHYHv6XJ3w3AAABACOGdy2W"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
EXPOSE 8005
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8005/docs || exit 1
CMD ["python", "-m", "uvicorn", "enhance_cv:app", "--host", "0.0.0.0", "--port", "8005"]

# ----------------- Job Search Agent Stage -----------------
# Reuse base-cv (CPU torch + sentence-transformers) then install JobSearch deps (docx, scrapers, etc.).
# Previously this stage used `base` only and never ran JobSearch-SUBUL/requirements.txt — missing `docx` and more.
FROM base-cv AS job-search-agent
COPY JobSearch-SUBUL/requirements.txt /tmp/jobsearch-requirements.txt
RUN pip install --no-cache-dir -r /tmp/jobsearch-requirements.txt \
    && pip install --no-cache-dir "pdfplumber>=0.10.0" "pymupdf>=1.23.0"
COPY shared/ /app/shared/
COPY JobSearch-SUBUL/ /app/
# cv_extraction.py imports section_utils (shared with CV Booster; lives in CV_Booster_Agent in repo)
COPY CV_Booster_Agent/section_utils.py /app/section_utils.py
ENV PYTHONPATH=/app
ENV AGENT_TYPE=job-search
ENV AZURE_OPENAI_ENDPOINT="https://jobsearch.openai.azure.com/"
ENV AZURE_OPENAI_API_KEY="placeholder-job-search-key"
ENV AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
ENV AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
ENV AZURE_SEARCH_ENDPOINT="https://search-tuteur-subul-skander.search.windows.net"
ENV AZURE_SEARCH_API_KEY="placeholder-search-key"
ENV AZURE_SEARCH_INDEX_NAME="index-subul-semantic-v2"
ENV AZURE_COSMOS_ENDPOINT="https://cosmosdbtutot.documents.azure.com:443/"
ENV AZURE_COSMOS_KEY="placeholder-cosmos-key"
ENV AZURE_COSMOS_DATABASE_NAME="EduTech_AI_Production"
ENV AZURE_COSMOS_CONTAINER_NAME="JobSearchSessions"
EXPOSE 8006
# Long start_period: first Cosmos init / model downloads can be slow; lazy embed avoids most delay.
HEALTHCHECK --interval=15s --timeout=10s --start-period=240s --retries=8 \
    CMD curl -f http://localhost:8006/docs || exit 1
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8006"]

