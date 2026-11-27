# Deploying Learnlab (production)

Target: one Docker host that already runs a reverse proxy (Caddy) on ports 80 and 443. Learnlab adds its own Compose project and one route; it never publishes a port itself.

## Shape

| Service | Network | Notes |
|---|---|---|
| `postgres` | private | data in the `learnlab-pg` volume |
| `api` | private | the generated REST API; unauthenticated, so it is never routed |
| `web` (`learnlab-web`) | private + `edge` | serves the frontend and proxies `/api`; the only thing the proxy reaches |
| `seed` | private | one-shot, `--profile seed` |

`edge` is an external Docker network shared only with the reverse proxy. Do not attach `web` to a network that holds other applications' databases.

**The public web server is the gate for the API.** It allows `GET`/`HEAD` everywhere and only these writes: `POST /api/learners`, `POST /api/progresses`, `PUT /api/progresses/<id>` (see `publicAPICall` in `cmd/web/main.go`, tested in `main_test.go`). Anything else answers 405. Course and lesson content changes only through the seeder, which talks to the API on the private network. Progress is anonymous by design (no accounts), so anyone who knows a progress id could overwrite that record; that is accepted until accounts exist.

## One-time setup on the server

```bash
docker network create edge                 # once per host
mkdir -p /opt/learnlab && cd /opt/learnlab
# copy docker-compose.prod.yml here; create .env.production (chmod 600):
#   POSTGRES_PASSWORD=<openssl rand -hex 16>
#   ENCRYPTION_KEY=<openssl rand -hex 32>
#   BLIND_INDEX_KEY=<openssl rand -hex 32>
#   INTERSVC_AUTH_KEY=<openssl rand -hex 32>
#   LOG_LEVEL=info
cp .env.production .env                    # compose reads POSTGRES_PASSWORD from .env
```

Keep the keys: they cannot be regenerated without invalidating encrypted rows. Back `.env.production` up somewhere safe, outside the server.

## Build and ship the image

```bash
TAG=$(git rev-parse --short HEAD)
docker build -t learnlab:$TAG .                        # builds from the public repo only
docker save learnlab:$TAG | ssh <server> docker load    # or push to a registry
```

## Start and seed

```bash
cd /opt/learnlab
export LEARNLAB_IMAGE=learnlab:<TAG>
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml --profile seed run --rm seed    # safe to repeat
```

## Route it

Add to the reverse proxy (Caddy) and reload, never recreate it:

```
learnlab.inxpired.com {
	import security_headers
	reverse_proxy learnlab-web:3100
}
```

The Caddy container must also be on `edge`: `docker network connect edge <caddy-container>`, and list `edge` under that service's `networks:` so a recreate keeps it. Back up the Caddyfile and run `caddy validate` before the reload.

## Update

Build and load a new tag, set `LEARNLAB_IMAGE`, run `docker compose ... up -d`, then the seed. Schema creation is idempotent in the app at boot; there are no separate migrations.

## Backup and restore

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres postgres | gzip > learnlab-$(date +%F).sql.gz
gunzip -c learnlab-<date>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres postgres
```

Course content can always be rebuilt with the seed; the learner progress rows are the only data worth backing up.

## Roll back

Remove the Caddy block and reload, then `docker compose -f docker-compose.prod.yml down` (add `-v` only to also delete the database). Other applications on the host are not touched.
