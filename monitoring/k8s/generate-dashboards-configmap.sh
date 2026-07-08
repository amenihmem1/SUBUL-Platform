#!/usr/bin/env bash
# Generates grafana-dashboards-configmap.yml from the 6 dashboard JSON files.
# Run from repo root: bash monitoring/k8s/generate-dashboards-configmap.sh
# Output is written to monitoring/k8s/grafana-dashboards-configmap.yml

set -euo pipefail

DASHBOARDS_DIR="monitoring/grafana/dashboards"
OUT="monitoring/k8s/grafana-dashboards-configmap.yml"

echo "apiVersion: v1" > "$OUT"
echo "kind: ConfigMap" >> "$OUT"
echo "metadata:" >> "$OUT"
echo "  name: grafana-dashboards" >> "$OUT"
echo "  namespace: default" >> "$OUT"
echo "data:" >> "$OUT"

for f in "$DASHBOARDS_DIR"/*.json; do
  name=$(basename "$f")
  echo "  ${name}: |" >> "$OUT"
  while IFS= read -r line; do
    echo "    ${line}" >> "$OUT"
  done < "$f"
done

echo "Generated: $OUT"
