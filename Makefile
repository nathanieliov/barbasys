.PHONY: prod-up prod-down prod-logs prod-restart \
        stage-up stage-down stage-logs stage-restart stage-refresh-db \
        up down logs ps

# ── Production ────────────────────────────────────────────────────────────────

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-restart:
	docker compose -f docker-compose.prod.yml restart app

# ── Stage ─────────────────────────────────────────────────────────────────────

stage-up:
	docker compose -f docker-compose.stage.yml --env-file .env.stage up -d --build

stage-down:
	docker compose -f docker-compose.stage.yml down

stage-logs:
	docker compose -f docker-compose.stage.yml logs -f

stage-restart:
	docker compose -f docker-compose.stage.yml restart app

# Snapshot prod DB → stage (stops stage first to avoid file lock)
stage-refresh-db:
	docker compose -f docker-compose.stage.yml stop app
	cp data/prod/barbasys.db data/stage/barbasys.db
	docker compose -f docker-compose.stage.yml start app
	@echo "Stage DB refreshed from prod snapshot"

# ── Both ──────────────────────────────────────────────────────────────────────

up: prod-up stage-up

down: prod-down stage-down

logs:
	docker compose -f docker-compose.prod.yml logs -f &
	docker compose -f docker-compose.stage.yml logs -f

ps:
	docker compose -f docker-compose.prod.yml ps
	docker compose -f docker-compose.stage.yml ps
