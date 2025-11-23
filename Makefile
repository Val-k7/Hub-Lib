# Makefile pour faciliter le déploiement de HubLib

.PHONY: help deploy build up down logs backup setup-ssl restart

help: ## Afficher cette aide
	@echo "Commandes disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

deploy: ## Déployer l'application en production
	@./scripts/deploy.sh

build: ## Construire les images Docker
	docker-compose -f docker-compose.prod.yml build --no-cache

up: ## Démarrer les services
	docker-compose -f docker-compose.prod.yml up -d

down: ## Arrêter les services
	docker-compose -f docker-compose.prod.yml down

logs: ## Voir les logs
	docker-compose -f docker-compose.prod.yml logs -f

backup: ## Créer une sauvegarde
	@./scripts/backup.sh

setup-ssl: ## Configurer SSL avec Let's Encrypt
	@./scripts/setup-ssl.sh

restart: ## Redémarrer les services
	docker-compose -f docker-compose.prod.yml restart

status: ## Vérifier le statut des services
	docker-compose -f docker-compose.prod.yml ps

clean: ## Nettoyer les volumes et images (ATTENTION: supprime les données)
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

