# Testes de RLS

`rls.sql` sobe usuários fictícios (duas artesãs, uma compradora e um
curioso) e tenta furar o isolamento: comprar peça já vendida, editar
produto alheio, avaliar sem ter comprado, se promover a admin, subir
arquivo na pasta de outra loja. Cada asserção imprime `PASSOU` ou
interrompe com `FALHOU`.

Rodam contra um Postgres local — não contra o projeto de produção.

## Como rodar

Precisa de Postgres 15+ instalado localmente.

```bash
# 1. sobe uma instância isolada
initdb -D /tmp/pgdata -U postgres
pg_ctl -D /tmp/pgdata -o '-p 5433 -k /tmp' start

# 2. cria o banco e aplica shim + migrations + testes
export PGPORT=5433 PGHOST=/tmp PGUSER=postgres
dropdb --if-exists artes_test && createdb artes_test
psql -d artes_test -f supabase/tests/00_shim_local.sql
for f in supabase/migrations/*.sql; do psql -d artes_test -v ON_ERROR_STOP=1 -f "$f"; done
psql -d artes_test -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

O esperado no fim é `TODOS OS TESTES PASSARAM`.

## O que é o shim

`00_shim_local.sql` recria o mínimo do ambiente Supabase que as
migrations assumem: os papéis `anon` / `authenticated`, o schema `auth`
com `auth.users` e `auth.uid()`, e o schema `storage` com `buckets`,
`objects` e `foldername()`. Serve **apenas** para o teste local; em
produção esses objetos são do próprio Supabase e este arquivo não deve
ser aplicado.

`auth.uid()` aqui lê `request.jwt.claim.sub`, então trocar de usuário no
teste é `SET request.jwt.claim.sub = '<uuid>'` depois de `SET ROLE
authenticated`.

## Duas armadilhas que apareceram escrevendo estes testes

1. `SELECT (minha_funcao()).*` executa a função **uma vez por coluna** do
   retorno. Numa função que insere pedido, isso cria N pedidos. Use
   `SELECT * FROM minha_funcao()`.
2. `INSERT ... SELECT` de uma tabela protegida por RLS não levanta erro
   quando o SELECT devolve zero linhas — simplesmente não insere nada.
   Testar "foi bloqueado?" esperando exceção dá falso positivo; conte as
   linhas resultantes.
