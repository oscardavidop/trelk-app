#!/bin/bash

# Configuración de rutas
SOURCE_CONF="/home/tom/app/frontend/scripts/nginx.conf"
TARGET_CONF="/etc/nginx/sites-available/app.trelk.site"
LINK_CONF="/etc/nginx/sites-enabled/app.trelk.site"

echo "🚀 Iniciando despliegue de configuración de Nginx..."

# 1. Verificar si el archivo de origen existe
if [ ! -f "$SOURCE_CONF" ]; then
    echo "❌ Error: No se encuentra el archivo en $SOURCE_CONF"
    exit 1
fi

# 2. Copiar el archivo a la carpeta de sitios disponibles
echo "📦 Copiando configuración..."
sudo cp "$SOURCE_CONF" "$TARGET_CONF"

# 3. Crear el enlace simbólico en sites-enabled si no existe
if [ ! -L "$LINK_CONF" ]; then
    echo "🔗 Creando enlace simbólico..."
    sudo ln -s "$TARGET_CONF" "$LINK_CONF"
fi

# 4. Validar la sintaxis de Nginx
echo "🔍 Validando sintaxis de Nginx..."
if sudo nginx -t; then
    # 5. Recargar Nginx si todo está bien
    echo "✅ Sintaxis correcta. Recargando Nginx..."
    sudo systemctl reload nginx
    echo "🎉 ¡Despliegue completado con éxito!"
else
    echo "⚠️ Error en la configuración de Nginx. Revisa el archivo."
    exit 1
fi
