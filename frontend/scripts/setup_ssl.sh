#!/bin/bash

# Configuración
EMAIL="tu-email@ejemplo.com"
DOMAIN="trelk.site"
CLOUDFLARE_TOKEN="Rws9kZJ0UCUdf_6PVqpXac-8-gDD9kmXzPRPrOh5"

echo "🔐 Instalando dependencias..."
sudo apt update && sudo apt install -y certbot python3-certbot-dns-cloudflare

echo "📂 Configurando credenciales..."
sudo mkdir -p /etc/letsencrypt
echo "dns_cloudflare_api_token = $CLOUDFLARE_TOKEN" | sudo tee /etc/letsencrypt/cloudflare.ini > /dev/null
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

echo "📜 Solicitando certificado Wildcard para $DOMAIN y *.$DOMAIN..."
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  --agree-tos \
  --no-eff-email \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "*.$DOMAIN"

echo "✅ ¡Listo! Los certificados están en /etc/letsencrypt/live/$DOMAIN/"
