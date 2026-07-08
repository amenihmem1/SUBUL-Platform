#!/usr/bin/env bash
# monitoring/setup-grafana-nginx.sh
# Run once on the production server as root (or with sudo).
# Sets up monitoring.subul.uk → Grafana on port 3005 with SSL.
#
# Usage:
#   scp monitoring/setup-grafana-nginx.sh monitoring/nginx-grafana.conf user@subul.uk:~
#   ssh user@subul.uk
#   sudo bash setup-grafana-nginx.sh

set -euo pipefail

DOMAIN="monitoring.subul.uk"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_LINK="/etc/nginx/sites-enabled/${DOMAIN}"
EMAIL="theprofessionalala@gmail.com"

echo "==> Checking dependencies..."
command -v nginx  >/dev/null || { apt-get update -qq && apt-get install -y nginx;  }
command -v certbot >/dev/null || { apt-get update -qq && apt-get install -y certbot python3-certbot-nginx; }

echo "==> Copying nginx config..."
cp nginx-grafana.conf "${NGINX_CONF}"

echo "==> Enabling site..."
ln -sf "${NGINX_CONF}" "${NGINX_LINK}"

echo "==> Testing nginx config..."
nginx -t

echo "==> Reloading nginx (HTTP only — before SSL cert)..."
systemctl reload nginx

echo "==> Obtaining SSL certificate for ${DOMAIN}..."
certbot --nginx \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  --redirect

echo "==> Reloading nginx with SSL..."
systemctl reload nginx

echo ""
echo "✓ Done. Grafana is now available at: https://${DOMAIN}"
echo ""
echo "Next steps:"
echo "  1. Make sure the DNS A record exists:  ${DOMAIN} → $(curl -s ifconfig.me)"
echo "  2. Set GRAFANA_ADMIN_PASSWORD in your .env on the server"
echo "  3. Restart Grafana if needed: docker compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml restart grafana"
