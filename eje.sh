#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function log_action() {
    echo -e "${BLUE}[$(date +%T)]${NC} $1"
    sleep 1.5
}

clear
echo -e "${CYAN}=== NUEVO USUARIO HA INGRESADO ===${NC}"
echo "------------------------------------"
sleep 1

log_action "🌐 Usuario ha cargado la página: ${YELLOW}/portalpagos.localhost/index.php?view=vistas/personal/claro/newclaro/inicio.php&id_objeto=10002#no-back-button${NC}"
log_action "🖱️  Evento detectado: ${GREEN}click_event${NC} en botón 'Pagar con Tarjeta'"

echo -e "${BLUE}[$(date +%T)]${NC} ⌨️  Usuario ingresando datos del formulario..."
sleep 2
echo -e "    > Titular: JUAN PEREZ"
sleep 0.8
echo -e "    > Número: 4444 2562 3262 2626 4421"
sleep 0.8
echo -e "    > Expiración: 12/28"
sleep 1

log_action "🚀 Enviando payload de transacción a la API..."
log_action "⏳ Notificando via Telegram..."

# Simular validación exitosa
echo -e "${GREEN}[OK] Transacción aprobada ID: tx_9928374${NC}"
log_action "✅ Redirigiendo usuario a: ${YELLOW}/checkout/success${NC}"

echo "------------------------------------"
