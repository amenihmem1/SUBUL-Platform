# AKS Deployment Fixes — 2026-03-29

## Seul fichier modifié : `eks/deployment.yml`

---

## PROBLÈME 1 — Backend CrashLoopBackOff

### Cause racine
L'image ECR `subul:subul-backend-latest` était une ancienne image Python/Flask.
Elle lançait `gunicorn "app:create_app()"` mais le module Flask n'existe plus.
Le backend est maintenant NestJS (port 3001), pas Flask (port 5000).

### Corrections appliquées

| Avant | Après |
|---|---|
| `containerPort: 5000` | `containerPort: 3001` |
| `targetPort: 5000` (backend-service) | `targetPort: 3001` |

### Action manuelle requise
Reconstruire et pousser l'image NestJS dans ECR :
```bash
docker build -f backend/api/Dockerfile \
  -t 014498640042.dkr.ecr.us-east-1.amazonaws.com/subul:subul-backend-latest \
  backend/
docker push 014498640042.dkr.ecr.us-east-1.amazonaws.com/subul:subul-backend-latest
kubectl rollout restart deployment/backend -n subul
```

---

## PROBLÈME 2 — Kafka CrashLoopBackOff

### Cause racine
`cp-kafka:7.2.1` exige des variables ENV absentes de la config.
Sans `KAFKA_INTER_BROKER_LISTENER_NAME`, le broker refusait de démarrer.

### Variables ajoutées

```yaml
- name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
  value: "PLAINTEXT:PLAINTEXT"          # mapping nom listener → protocole (obligatoire en 7.x)
- name: KAFKA_INTER_BROKER_LISTENER_NAME
  value: "PLAINTEXT"                    # listener utilisé pour la communication inter-broker
- name: KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR
  value: "1"                            # single broker → doit être 1
- name: KAFKA_TRANSACTION_STATE_LOG_MIN_ISR
  value: "1"                            # single broker → doit être 1
- name: KAFKA_AUTO_CREATE_TOPICS_ENABLE
  value: "true"                         # crée les topics automatiquement
```

---

## PROBLÈME 3 — job-scraper / job-consumer / prefect-agent

### État réel du code (jobsearchsubul/)
Tous les fichiers Python existaient déjà et fonctionnent :
- `consumer.py` — consomme Kafka ou idle proprement si non configuré
- `deployment.py` — stub Prefect qui réussit toujours
- `producer.py` — envoie à Kafka (no-op si non configuré)
- `scrapmain.py` — scrape Qureos (mode minimal), tourne une fois et quitte
- `qureos.py` — scraper Selenium Qureos
- `tool.py` — utilitaires date/texte
- `Dockerfile` — complet (Chromium + toutes les dépendances)
- `requirements.txt` — complet

### Problème identifié
`scrapmain.py` tourne une fois et quitte (exit 0).
Un `Deployment` K8s redémarre le pod en boucle → CrashLoopBackOff sur exit 0.

### Correction appliquée — job-scraper
Converti de `Deployment` en `CronJob` :
```yaml
apiVersion: batch/v1
kind: CronJob
spec:
  schedule: "0 * * * *"       # toutes les heures
  concurrencyPolicy: Forbid   # interdit deux exécutions simultanées
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
```

### Corrections appliquées — job-consumer
- Suppression de l'appel à `entrypoint.sh` (lisait `/mnt/secrets/db_user_secret` inexistant)
- Invocation directe : `command: ["python3", "-m", "jobsearchsubul.tools.consumer"]`
- `SKIP_DB_WAIT: "true"` conservé
- Resources ajoutées (128Mi/100m → 256Mi/250m)
- Liveness probe ajoutée

### Corrections appliquées — prefect-server
- `volumes:` remonté au niveau `spec` (était mal indenté dans `containers:`)
- Readiness probe ajoutée sur `/api/health`

### Corrections appliquées — prefect-agent
- Heredoc sh corrigé (`>` → `|` pour préserver les sauts de ligne)
- Resources ajoutées (256Mi/250m → 512Mi/500m)

### Action manuelle requise
Construire l'image et remplacer `YOUR_ACR` dans le YAML :
```bash
az acr login -n YOUR_ACR
docker build -f jobsearchsubul/Dockerfile \
  -t YOUR_ACR.azurecr.io/subul-job-scraper:latest .
docker push YOUR_ACR.azurecr.io/subul-job-scraper:latest
sed -i 's/YOUR_ACR/ton-registry/g' eks/deployment.yml
```

---

## Commandes d'application AKS

```bash
# Appliquer tous les changements
kubectl apply -f eks/deployment.yml -n subul

# Redémarrer backend et kafka
kubectl rollout restart deployment/backend deployment/kafka -n subul

# Vérifier l'état
kubectl get pods -n subul
kubectl get cronjob job-scraper -n subul

# Lancer un test manuel du scraper
kubectl create job --from=cronjob/job-scraper job-scraper-test -n subul
kubectl logs job/job-scraper-test -n subul -f

# Logs backend
kubectl logs deployment/backend -n subul -f

# Logs kafka
kubectl logs deployment/kafka -n subul -f
```

---

## Ce qui reste à faire (non bloquant)

| Tâche | Priorité |
|---|---|
| Rebuild image ECR backend NestJS et push | Critique — backend ne démarrera pas sans ça |
| Build image ACR job-scraper et remplacer YOUR_ACR | Critique — consumer/agent ne peuvent pas puller l'image |
| Ajouter scrapers careerjet/gulftalent/naukrigulf | Optionnel — passer SCRAPER_MODE=full |
| Écrire vrais Flows Prefect dans deployment.py | Optionnel — actuellement stub |
| Ajouter persistance PostgreSQL dans consumer.py | Optionnel — actuellement log seulement |

---

## Commit

- Branch : `enhance-cv-agent-fixes`
- Commit : `6803b67`
- Fichier modifié : `eks/deployment.yml` (114 insertions, 43 suppressions)
