# C-013B.1 — segurança e preparação Linux

Plano de trabalho em andamento para a demonstração restrita do Meu Casamento. A branch `c013b1-seguranca-linux` parte do commit `333ba70eb15d7ace6f960322e3aece39fd255852` e preserva os documentos pendentes da C-013A. Não houve contratação, provisionamento, deploy, alteração de DNS, acesso a banco persistente ou execução de migrations nesta missão. Nenhum commit ou push está autorizado por este documento.

## Perímetro e limite de tentativas

O proxy de homologação envolve as rotas, os arquivos públicos e os assets do Next.js, independentemente do hostname. O limite é global: oito credenciais Basic incorretas em uma janela móvel de 15 minutos; a oitava tentativa recebe `429` e credenciais corretas também ficam bloqueadas enquanto o limite estiver esgotado. A resposta informa `Retry-After`. Um acesso sem o cabeçalho `Authorization` recebe o desafio `401` e não consome uma tentativa. Em condições normais o bloqueio termina quando a falha mais antiga sai da janela; uma autenticação válida não apaga as falhas registradas.

O estado é mantido em SQLite no diretório privado persistente indicado por `NOIVARA_HOMOLOG_RATE_LIMIT_DIR`, e contém horários de falhas, sem credenciais. O limitador não usa IP nem confia em `Host` ou cabeçalhos `X-Forwarded-*` para definir o limite. O código não registra cabeçalhos ou segredos; também é necessário conferir a configuração de logs do provedor para evitar que registre `Authorization` ou outros segredos.

Com configuração inválida, diretório inacessível, arquivos inválidos, estado corrompido ou erro de acesso ao armazenamento, requisições com credenciais recebem `503`, sem fallback para um contador em memória. Mesmo nessa condição, um pedido sem credenciais recebe `401`, sem acesso ao conteúdo. A configuração geral inválida de homologação também resulta em `503`. As respostas do perímetro evitam cache compartilhado. Testes direcionados e um smoke HTTP local em Linux cobriram cenários descritos abaixo; a verificação externa completa no serviço real continua pendente.

O otimizador `/_next/image` pode substituir o cabeçalho privado por uma diretiva de cache público. Como a aplicação atual não usa `next/image`, o proxy bloqueia esse caminho no modo de homologação: sem credenciais responde com o desafio `401`; após um Basic aceito responde `404` com `no-store`. O comportamento foi conferido no smoke Linux; ainda deve ser verificado no provedor. Se `next/image` for adotado futuramente, redesenhar e testar a autorização e o cache antes de liberar o otimizador.

### Diretório e durabilidade

- Use um diretório **absoluto, preexistente, exclusivo para o contador**, dentro do disco persistente privado, fora do projeto, de `public/` e do diretório de fotos. Um exemplo de organização é um diretório próprio sob o mesmo volume das fotos, mas sem sobreposição entre os caminhos. Configure `PHOTO_STORAGE_DIR` separadamente.
- Em Linux, o diretório deve pertencer ao usuário efetivo do processo e ter modo `0700`; os arquivos de estado precisam pertencer ao mesmo usuário e ter modo `0600`. Os componentes do caminho do contador não podem ser links simbólicos. Verifique a montagem, o caminho real, o proprietário e as permissões no ambiente do serviço: apenas declarar uma variável não comprova que o volume está montado.
- Após conferir a montagem e a identidade do usuário, crie o diretório pelo shell da instância web antes de compartilhar o acesso. A aplicação não cria o diretório. Ao receber uma requisição com credenciais, pode inicializar os dois arquivos `.noivara-homologation-basic-rate-v1.sqlite` e `.noivara-homologation-basic-rate-v1.initialized` quando ambos estiverem ausentes. Eles, e eventual journal do SQLite, devem permanecer privados e fora do Git e da mídia.
- Se apenas um dos dois arquivos estiver ausente, o acesso com credenciais falha fechado; não apague nem recrie arquivos de estado para contornar o problema. Investigue interrupções ou corrupção antes de qualquer recuperação. A perda dos dois arquivos é indistinguível de uma primeira inicialização e pode reiniciar a contagem; restaurar os dois a um snapshot anterior pode retroceder as falhas sem detecção pela aplicação. Reinícios preservam o limite somente se o mesmo volume íntegro for montado. Verifique persistência e continuidade da contagem antes de compartilhar o endereço.
- A Render documenta shell no painel e SSH para web service pago; o plano gratuito não os oferece. Use o shell da **instância web em execução**, conferindo a montagem; uma sessão efêmera cria outra instância e pode gerar custo. Jobs avulsos, build e pre-deploy não acessam o disco da instância web. Configure perímetro, variável e volume no momento da criação do serviço; até criar e verificar o diretório, pedidos com credenciais recebem `503` e acessos anônimos recebem `401`. Não use uma exceção pública de health check para contornar o perímetro. [Shell e SSH](https://render.com/docs/ssh), [discos persistentes](https://render.com/docs/disks), [jobs avulsos](https://render.com/docs/one-off-jobs) e [health checks](https://render.com/docs/health-checks).
- Como o disco também contém SQLite em uso, não presuma que um snapshot do volume seja um backup consistente do contador: a Render desaconselha restaurar snapshots para recuperar bancos próprios. Preparar e testar uma recuperação segura do estado SQLite e uma recuperação coordenada das fotos e do PostgreSQL, verificando integridade e possíveis lacunas na janela de tentativas. [Recuperação de bancos em disco](https://render.com/docs/disks#restoring-a-custom-database).

### Limitações e controle adicional

Um atacante pode provocar o limite global e bloquear temporariamente Caio e o próprio responsável; é um controle contra tentativas, **não proteção completa contra negação de serviço**. A implementação usa operações SQLite síncronas, com custo por requisição autenticada; contenção, I/O ou falha do disco podem reduzir disponibilidade ou causar `503`. O desenho é para uma instância com um único disco, não uma implantação distribuída. A contagem também depende do relógio do host.

**Antes da primeira exposição**, definir um controle de infraestrutura independente contra abuso e bypass e um procedimento verificável para todos os caminhos à origem, incluindo `onrender.com` enquanto estiver habilitado. O Basic e seu armazenamento devem falhar fechados desde a primeira exposição, inclusive enquanto o diretório privado ainda não estiver pronto. Comprovar o controle adicional no serviço real **antes de compartilhar** com Caio; se a cobertura não puder ser confirmada, manter o acesso fechado e não compartilhar até existir solução verificada. Uma proteção apenas em `demo.meucasamento.ia.br` não cobre automaticamente o endereço padrão. Confirmar disponibilidade, efetividade, custo e comportamento para assets no plano escolhido; não presumir que WAF ou proteção DDoS genérica implemente esse requisito. Após conectar um domínio personalizado, desabilitar `onrender.com` quando possível e testar o resultado; sua desativação isolada também não comprova que outros caminhos para a origem estejam bloqueados. [Domínios da Render](https://render.com/docs/custom-domains).

Gerar senhas fortes, aleatórias e distintas para o Basic, a conta fictícia e o banco; não reutilizar credenciais locais antigas. O Basic complementa a autenticação da aplicação e não substitui as verificações de sessão, propriedade, acesso às fotos, origem/CSRF e cadastro bloqueado. O perímetro cobre imagens publicadas durante a demonstração; imagens privadas continuam sujeitas à autorização da aplicação. Não introduzir credenciais, dados reais ou mídias privadas no repositório, logs ou conversa.

## Execução em Linux

A configuração de trabalho fixa Node **24.22.1** em `.node-version` e declara suporte `>=24.22.1 <25` no projeto. Essa versão substitui a candidata 24.21.0 da C-013A porque a atualização de segurança publicada em 21/10 corrige falhas de gravidade alta na linha 24; o risco específico deve ser reavaliado com a versão disponível antes do deploy. O limitador usa a API integrada síncrona `node:sqlite` do Node 24, em estágio de release candidate; ela não adiciona um serviço ou pacote externo. A instalação, o build e o smoke HTTP passaram em Linux isolado; a versão selecionada pela plataforma e o desempenho sob a carga real permanecem sujeitos à validação. [Aviso de segurança do Node](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), [SQLite do Node 24](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) e [versão de Node na Render](https://render.com/docs/node-version).

Comandos previstos: o build e a inicialização foram testados em Linux isolado; as migrations não foram executadas nesta missão. Todos ainda precisam ser verificados no provedor autorizado:

```sh
# Build, com a CLI Prisma disponível em devDependencies
npm ci --include=dev && npm run db:generate && npm run build

# Inicialização, usando a porta fornecida pela plataforma
npm run start -- --hostname 0.0.0.0 --port "$PORT"

# Somente após aprovação e confirmação do PostgreSQL novo e exclusivo
npx prisma migrate deploy
npx prisma migrate status
```

Não usar `npm run db:migrate`: ele executa `prisma migrate dev`. As migrations não devem executar automaticamente no pre-deploy. A CLI Prisma precisa estar disponível no ambiente autorizado que executará os comandos. `APP_URL` deve ser a origem HTTPS escolhida, sem caminho ou barra final; formulários e ações devem ser testados nessa origem. O TLS público e o domínio real precisam ser verificados na infraestrutura antes de compartilhar.

Os nomes e marcadores abaixo não são credenciais nem valores prontos para uso:

```text
NODE_VERSION=<versao-node-validada>
NODE_ENV=<modo-producao>
DATABASE_URL=<url-interna-do-postgresql-exclusivo-com-tls>
APP_URL=<origem-https-da-demonstracao>
PHOTO_STORAGE_DIR=<diretorio-privado-de-fotos-no-volume>
NOIVARA_HOMOLOG_RATE_LIMIT_DIR=<diretorio-privado-exclusivo-do-contador-no-volume>
NOIVARA_HOMOLOGACAO=<modo-de-homologacao>
NOIVARA_HOMOLOG_USUARIO=<usuario-do-perimetro>
NOIVARA_HOMOLOG_SENHA=<senha-aleatoria-do-perimetro>
NOIVARA_HOMOLOG_CONTA_ID=<identificador-da-conta-ficticia>

# Apenas para o bootstrap, com destino confirmado
NOIVARA_HOMOLOG_DATABASE_NAME=<nome-interno-confirmado>
NOIVARA_HOMOLOG_CONTA_SENHA=<senha-aleatoria-distinta-da-conta>

# Fornecidas pela plataforma
RENDER=<indicador-da-plataforma>
PORT=<porta-fornecida-pela-plataforma>
```

Os segredos reais devem ser inseridos no gerenciador de segredos do provedor; o segredo da conta necessário ao bootstrap deve ser removido do ambiente usado pela rotina após sua execução. As demais restrições de formato e comprimento constam em [DEMONSTRACAO-C011.md](DEMONSTRACAO-C011.md).

## Bootstrap e dados fictícios

O procedimento existente exige modo de produção e homologação, indicador Render, hostname interno `dpg-…`, TLS exigido, nome interno exclusivo do banco em formato restrito e confirmação explícita no argumento. Após conectar, verifica a identidade, as tabelas esperadas, as quatro migrations e seus checksums e a ausência de dados; bloqueia gravações concorrentes e cria os registros em uma transação. Uma segunda execução é recusada quando existem dados; ela não apaga, duplica nem sobrescreve registros existentes. Se o resultado for incerto, inspecione o destino e a transação antes de repetir.

As guardas impedem destinos locais comuns, mas nomes e variáveis por si só não comprovam que um recurso seja novo e autorizado. Conferir no painel o recurso, a URL interna, a região e a propriedade antes da aplicação de migrations ou do bootstrap; o Prisma executado separadamente não herda as guardas do script. Nunca apontar para banco persistente de desenvolvimento ou de outro projeto. Não tentar login antes do bootstrap, pois o registro de tentativas impede a verificação de banco vazio. [Procedimento C-011](DEMONSTRACAO-C011.md).

A rotina cria uma conta fictícia, três casamentos publicados e 18 presentes simbólicos, sem pagamentos reais nem fotos. Fotos com direitos confirmados serão enviadas pela aplicação depois da implantação autorizada e da validação do perímetro; depois, os três sites precisam ser republicados. Não copiar bancos ou mídias locais para o ambiente online.

No PostgreSQL interno da Render, `sslmode=require` cifra a conexão, mas a configuração documentada para Prisma 6 não autentica a identidade do servidor com o certificado interno autoassinado. Confirmar a rede, o destino e a aceitação explícita dessa limitação antes do uso. [TLS PostgreSQL na Render](https://render.com/docs/postgresql-creating-connecting) e [Prisma 6](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).

## Validação e pendências

Em uma cópia isolada no Linux com Node 24.22.1 e npm 11.19.1, passaram `npm ci --include=dev`, geração do Prisma Client, `prisma validate`, typecheck e build. A validação do Prisma usou uma `DATABASE_URL` sintética, sem conexão ao PostgreSQL. Foram aprovados **81 testes direcionados** nos seis arquivos `homologation-rate-limit`, `homologation-perimeter`, `homologation-isolation`, `homologation-actions`, `homologation-storage` e `c011-demo-guard`.

No smoke HTTP real, o servidor iniciou com `--hostname 0.0.0.0` e uma porta dinâmica; os clientes conectaram a `127.0.0.1` simulando dois hosts. Isso verifica a inicialização com essas opções e a resposta via loopback, sem inspeção independente do socket nem teste de outra interface; DNS, TLS, rede externa e proxy da Render também não foram verificados. Acessos anônimos a páginas, rotas de fotos e asset JavaScript receberam `401`; o Basic válido abriu a landing, e o painel sem sessão redirecionou com `307`. Um asset JavaScript real respondeu `200` com `no-store` quando autorizado e `401` anonimamente; `/_next/image` respondeu `404` com `no-store` após autorização. Os dois hosts e cabeçalhos de IP/proxy forjados não contornaram o perímetro. As primeiras sete falhas receberam `401`, a oitava recebeu `429` com `Retry-After`, e a credencial correta também foi bloqueada. O bloqueio persistiu após reinício, com arquivos `0600` em diretório `0700`; os logs examinados não continham a senha ou o cabeçalho sintético.

Os três testes originais de `photo-storage.test.ts` também passaram. Um teste sintético adicional, criado somente na fixture Linux, usou `LocalPhotoStorage` em modo de homologação de produção para gravar e reler bytes fora do checkout, verificando diretório `0700`, arquivo `0600` e recusa de sobrescrita. Esse teste não equivale ao fluxo completo de upload e processamento de fotografias.

A cópia de teste não continha `.env`, imagens ou bancos reais, e a `DATABASE_URL` era sintética. Nenhuma consulta ou migration PostgreSQL foi feita, e nenhuma foto ou banco existente foi acessado. A falta de imagens limita o smoke: upload, leitura de fotografias reais e revisão visual seguem pendentes. A fixture Linux e seu armazenamento temporário não comprovam a montagem, as permissões nem a persistência do disco no provedor.

A seleção de Node, a escuta em `0.0.0.0`/`PORT`, a conexão ao banco, sessão expirada, upload, logs, proteção independente de infraestrutura e comportamento dos dois hosts devem ser conferidos no serviço real após as autorizações. As quatro migrations foram validadas na C-011D em PostgreSQL descartável, mas a identidade e aplicação no banco novo online requerem autorização específica. Não executar migrations de teste contra bancos existentes.

O orçamento da C-013A permanece uma referência de **US$ 13,25 a US$ 13,55/mês**, antes de impostos, câmbio, excedentes e recuperação; confirmar o plano, a cobrança e qualquer controle adicional no painel antes de contratar. A demonstração não representa liberação para produção.

## Proposta da C-013B.2

1. Revisar o diff e os resultados da C-013B.1; obter autorização específica para commit e, depois, para push da branch ou de um commit aprovado. Não publicar refs internas antigas.
2. Definir o controle independente contra abuso e bypass em todos os hosts antes da exposição, com procedimento para comprová-lo no serviço real antes de compartilhar. Confirmar o acesso operacional ao shell da instância, custo, região, direitos das imagens, TLS interno e plano de recuperação. Configurar Basic e volume para falhar fechado desde a primeira exposição; manter deploy automático desabilitado e selecionar a revisão aprovada.
3. Após autorização específica, criar o PostgreSQL novo e exclusivo e o web service com disco. Confirmar a identidade do banco e aplicar as quatro migrations; executar o bootstrap com as guardas e o destino conferidos. Conferir a montagem e criar o diretório privado do contador na instância web, sem usar jobs para acessar o disco.
4. Após autorização de DNS e deploy, conectar o subdomínio, validar o certificado HTTPS, as duas origens enquanto ativas e o bloqueio de acessos indevidos; desabilitar `onrender.com` quando possível. Testar sessão, formulários, imagens, templates, dados fictícios, reinício, persistência e recuperação coordenada de banco e disco.
5. Somente com todos os controles validados e credenciais entregues por canal seguro, compartilhar o endereço com Caio. Nenhum recurso, cobrança, DNS ou deploy está autorizado por este roteiro.
