# NE:ONE - opeN sourcE: ONE Record Server Setup Guide

**Skills.md** — How to set up and run NE:ONE (IATA ONE Record compliant server)

**Project**: [https://git.openlogisticsfoundation.org/wg-digitalaircargo/ne-one](https://git.openlogisticsfoundation.org/wg-digitalaircargo/ne-one)  
**Description**: Open-source, free-to-use ONE Record server software developed by the Digital Testbed Air Cargo (DTAC). Fully compliant with IATA ONE Record API (v2.2) and data model (v3.2.0).  
**Current ontology**: CARGO 3.2.0 + ONE Record API Ontology 2.2.0

> **Goal**: Easy implementation of the new global air-cargo data-sharing standard.

For more info:  
- IATA ONE Record GitHub: [https://github.com/IATA-Cargo/ONE-Record](https://github.com/IATA-Cargo/ONE-Record)  
- Contact: oliver.ditz@iml.fraunhofer.de  
- Contribute: See `CONTRIBUTING.md` in the repo.

---

## 1. Getting Started

### Quick Start Options
1. **Run with Docker** (recommended for production / quick testing)
2. **Docker Compose** (full-featured setups with persistence, TLS, mTLS, Keycloak, etc.)
3. **Development mode** (for contributors)

---

## 2. Installation

### 2.1 Plain Docker (minimal)

```bash
docker run -d --name neone \
  -p 8080:8080 \
  git.openlogisticsfoundation.org:5050/wg-digitalaircargo/ne-one:latest
```

- `latest` = latest release  
- `dev` = latest development build  
- Image with **mandatory mTLS**: `ne-one-mtls`

**Default ports**: 8080 (HTTP)  
**Default data holder**: `http://localhost:8080/logistics-objects/_data-holder`

### 2.2 Docker Compose (recommended)

All compose files are in `src/main/docker-compose/`.

#### Minimal setup
```bash
docker compose up -d
```

#### Most common combinations

| Command | Purpose | Env files |
|---------|---------|-----------|
| `docker compose up -d` | Minimal (in-memory) | `.env` |
| `docker compose -f docker-compose.yml -f docker-compose.graphdb.yml -f docker-compose.graphdb-server.yml up -d` | + GraphDB persistence | `graph-db.env` |
| `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d` | + TLS (port 8443) | `tls.env` |
| `docker compose -f docker-compose.yml -f docker-compose.mtls.yml up -d` | + mTLS (port 8443) | `tls.env`, `mtls.env` |
| `docker compose -f docker-compose.yml -f docker-compose.mockserver.yml up -d` | + Mock server (notifications) | — |

**Important**: Always put `docker-compose.yml` **first** in the list.

#### Required environment variables (`.env` / `lo-id.env`)

| Variable                  | Description                          | Example                  |
|---------------------------|--------------------------------------|--------------------------|
| `LO_ID_CONFIG_HOST`       | External hostname                    | `localhost` or `your-domain.com` |
| `LO_ID_CONFIG_SCHEME`     | `http` or `https`                    | `https`                  |
| `LO_ID_CONFIG_PORT`       | External port                        | `8443`                   |
| `LO_ID_CONFIG_ROOT_PATH`  | Reverse-proxy path (optional)        | `/`                      |

---

## 3. Optional Services

### 3.1 GraphDB Persistence
```bash
docker compose -f docker-compose.yml -f docker-compose.graphdb.yml -f docker-compose.graphdb-server.yml up -d
```

### 3.2 Keycloak (JWT Authentication)
```bash
docker compose -f docker-compose.keycloak.yml up -d
```

- URL: `http://localhost:8989`
- User: `admin` / `admin`
- Realms: `neone` and `neone2`
- Pre-configured clients & users (see README for secrets)

### 3.3 MinIO (S3 Blob Storage)
```bash
docker compose -f docker-compose.minio.yml up -d
```

Default credentials: `admin` / `admin123`

### 3.4 Mock Server (Subscriptions & Notifications)
```bash
docker compose -f docker-compose.mockserver.yml up -d
```
Dashboard: `http://localhost:1080/mockserver/dashboard`

### 3.5 Monitoring (Prometheus + Grafana)
```bash
docker compose -f docker-compose.monitoring.yml up -d
```

---

## 4. Security & Certificates

### 4.1 mTLS (Mutual TLS) – Production Recommended

**Default port**: 8443

**Create your own certificates** (example with OpenSSL + keytool):

```bash
# 1. Root CA
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout rootCA.key -out rootCA.crt -subj "/CN=NEONE CA"

# 2. Server cert
openssl req -new -newkey rsa:4096 -nodes -keyout localhost.key -out localhost.csr \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
openssl x509 -req -CA rootCA.crt -CAkey rootCA.key -in localhost.csr -out localhost.crt \
  -days 365 -CAcreateserial -copy_extensions copyall

# 3. Server keystore
openssl pkcs12 -export -out localhost.p12 -name "localhost" \
  -inkey localhost.key -in localhost.crt -passout pass:changeit

# 4. Truststore (CA)
keytool -import -file rootCA.crt -alias neoneCA -keystore truststore.p12 -storepass changeit

# 5. Client cert (repeat similar steps)
```

Place files in `config/` and update `tls.env` / `mtls.env`.

**Disable mTLS** (only TLS):
```properties
quarkus.http.ssl.client-auth=none
```

---

## 5. First Logistics Object (Quick Test)

```bash
curl --request POST \
  --url http://localhost:8080/logistics-objects \
  --header 'Accept: application/ld+json' \
  --header 'Content-Type: application/ld+json' \
  --data '{
    "@context": { "@vocab": "https://onerecord.iata.org/ns/cargo#" },
    "@type": "cargo:Piece",
    "handlingInstructions": [{
      "@type": "cargo:HandlingInstructions",
      "hasDescription": "Valuable Cargo",
      "isOfHandlingInstructionsType": "SPH",
      "isOfHandlingInstructionsTypeCode": "VAL"
    }]
  }'
```

Then **create an ACL** for your data holder (using the `Location` header from above).

---

## 6. Authorization API (ACLs)

All internal ACL endpoints are under `/internal/acls`.

- **Grant access** → `POST /internal/acls/grant`
- **Create ACL** → `POST /internal/acls` (JSON-LD with `acl:Authorization`)
- **Get / Update / Delete / Find** ACLs (see full endpoints in original README)

Use `acl:Read`, `acl:Write`, or both.

---

## 7. Configuration Highlights

| Property | Default | Use case |
|----------|---------|----------|
| `repository-type` | `in-memory` | `native`, `http` (GraphDB), `sparql` |
| `validate-subscribers` | `false` | Enable third-party subscriber validation |
| `forward-notifications` | `false` | Forward notifications to external service |
| `auto-accept-subscription-proposals` | `true` | Auto-accept after 60 min |
| `jsonld.mode` | `compact` | `flatten` or `expand` |
| `lo-id-config.random-id-strategy` | `uuid` | `nanoid` for shorter IDs |

Full config in `src/main/resources/application.conf`.

---

## 8. Development Mode

```bash
./mvnw compile quarkus:dev
```

- Dev UI: `http://localhost:8080/q/dev`
- Persistent store: set `repository-type=http` + start GraphDB

---

## 9. Caching Remote Objects (Redis)

Enable with:
```properties
quarkus.cache.enabled=true
quarkus.redis.hosts=redis://localhost:6379
```

Requires re-augmentation of the Docker image (see README for multi-stage Dockerfile).

---

## 10. Testing & Performance

- **Interoperability test** between two NE:ONE instances (use `--net=host`)
- **Integration tests**: `mvn verify -Pintegration`
- **Performance tests**: JMeter or Gatling (see `performance-test.sh`)

---

**Done!** You now have a fully functional, production-ready ONE Record server.

Copy this entire file into `skills.md` in your knowledge base.  
For the absolute latest version always check the official repo.  

Happy ONE Record journey! ✈️
