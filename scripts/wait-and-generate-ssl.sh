#!/bin/bash
# Script qui attend la fin de la limite Let's Encrypt puis génère les certificats
# Usage: sudo ./scripts/wait-and-generate-ssl.sh

set -e

LIMIT_TIME=$(date -d '2025-11-23 11:32:47 UTC' +%s)
CURRENT_TIME=$(date +%s)
REMAINING=$((LIMIT_TIME - CURRENT_TIME))

if [ $REMAINING -gt 0 ]; then
    echo "⏰ Limite Let's Encrypt encore active"
    echo "⏳ Attente de $REMAINING secondes ($(($REMAINING / 60)) minutes)..."
    sleep $REMAINING
    echo "✅ Limite expirée, génération des certificats..."
else
    echo "✅ Limite expirée, génération des certificats..."
fi

# Exécuter le script de génération
cd "$(dirname "$0")/.."
exec ./scripts/generate-ssl.sh

