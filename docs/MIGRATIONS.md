# Migrations & Backup — fluxo seguro do banco

> Fundação (Fase 0 do roadmap ERP). Objetivo: nunca mais aplicar schema
> destrutivo em produção sem revisão, e sempre ter como voltar.

## Regras de ouro

1. **NUNCA** rode `prisma db push` contra a produção. Toda mudança de schema
   vira uma **migration versionada** e revisável.
2. Trabalhe **sempre** na cópia oficial: `C:\Users\cevso\projects\masar-app`
   (é a que faz push pro GitHub e alimenta o Railway). Ignore/apague qualquer
   outra cópia (ex: `.gemini\antigravity\scratch\...`) pra não divergir.
3. Produção aplica migrations sozinha no deploy: o `Dockerfile` roda
   `prisma migrate deploy` no boot. Você só precisa **commitar** a migration.

## Pré-requisito (uma vez): um Postgres local

O fluxo `prisma migrate dev` precisa de um banco local. Use o docker-compose
deste repo (Postgres 18, mesmo major da produção):

```bash
docker compose up -d postgres        # sobe o Postgres local na porta 5432
cd masar-web
cp .env.example .env                  # DATABASE_URL já aponta pro banco local
```

> Se ainda não tem Docker: instale o **Docker Desktop**
> (https://www.docker.com/products/docker-desktop/). Alternativa: instalar o
> Postgres 18 nativo no Windows e ajustar a `DATABASE_URL` do `.env`.

## Fazer uma mudança de schema (o fluxo normal)

```bash
cd masar-web
# 1. edite prisma/schema.prisma (adicione/altere modelo, campo, enum...)
# 2. gere + aplique a migration NO BANCO LOCAL, e dê um nome descritivo:
npx prisma migrate dev --name adiciona_fornecedor
# 3. confira o SQL gerado em prisma/migrations/<timestamp>_adiciona_fornecedor/
# 4. teste a app localmente contra o banco local
# 5. commit da migration + do schema, e push:
git add prisma/ && git commit -m "feat(db): ..." && git push
# 6. o Railway faz deploy e roda `migrate deploy` — a migration entra em prod.
```

Mudanças **aditivas** (coluna nova nullable, tabela nova) são seguras. Para
mudanças **destrutivas** (drop/rename de coluna com dados), revise o SQL com
cuidado e garanta que há backup recente (veja abaixo).

## Backups

Um GitHub Action (`.github/workflows/backup-db.yml`) roda `pg_dump` todo dia às
03:00 BRT e guarda o dump como **artifact** do repositório por 90 dias. Também
dá pra disparar sob demanda: aba **Actions → Backup do Banco Masar → Run workflow**.

### Testar que um backup REALMENTE restaura (recomendado periodicamente)

```bash
docker compose up -d postgres
# baixe o .dump mais recente (Actions > run > Artifacts) para ./backup.dump
# restaure num banco local descartável:
docker exec -i masar-postgres psql -U postgres -c "DROP DATABASE IF EXISTS restore_test; CREATE DATABASE restore_test;"
docker exec -i masar-postgres pg_restore -U postgres -d restore_test --no-owner --no-privileges < backup.dump
# inspecione algumas tabelas para confirmar que os dados vieram
docker exec -i masar-postgres psql -U postgres -d restore_test -c "SELECT count(*) FROM \"User\";"
```

Se restaurou e os dados batem, o backup presta. Esse é o teste que fecha a
"Fase 0c" de verdade.
