# C-013A — preparação técnica da homologação online

Revisão em 21/10/2026 para uma demonstração restrita ao parceiro Caio. O endereço `demo.meucasamento.ia.br` é planejado e ainda não foi conectado ou verificado. Esta é uma proposta: não houve provisionamento, deploy, alteração de DNS, acesso a banco persistente ou aplicação de migrations nesta missão.

## Estado e arquitetura recomendada

O Git estava limpo em `master`, no commit `333ba70eb15d7ace6f960322e3aece39fd255852`, igual à referência local `origin/master`; o repositório privado já recebeu a branch revisada na C-012B. Os trabalhos funcionais anteriores estão concluídos e preservados no histórico. Nenhuma ref interna antiga deve ser enviada em futuras operações.

Para a menor configuração razoável com persistência, propor um workspace Render Hobby com uma instância web paga de 512 MB, um PostgreSQL pago novo e exclusivo de 256 MB, e um disco privado de 1 GB ligado à instância web, todos na mesma região. A aplicação mantém os metadados das fotos no banco e os arquivos no disco. O plano é para uma única instância e poucos usuários; memória, tempo de resposta, build e uploads ainda precisam ser validados em Linux. Desabilitar o deploy automático e selecionar o commit aprovado. O web service tem endereço acessível pela internet, então o perímetro deve estar configurado antes de sua criação iniciar o primeiro deploy. [Serviços web](https://render.com/docs/web-services) e [deploys](https://render.com/docs/deploys).

O PostgreSQL deve ter credenciais novas e próprias, sem cópia do banco de desenvolvimento; restringir o acesso externo e usar a URL interna direta entre recursos da mesma região. A Render suporta TLS interno com `sslmode=require`, mas usa certificado autoassinado e não suporta `verify-ca` ou `verify-full` nessa conexão; o padrão do Prisma 6 aceita certificados inválidos. Assim a conexão é cifrada, mas a identidade do servidor não é autenticada. A escolha exige confirmação da rede e do destino e aceitação explícita dessa limitação, ou estudo e validação de outra solução que preserve as guardas do bootstrap. [Render PostgreSQL](https://render.com/docs/postgresql-creating-connecting) e [Prisma 6](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).

## Custos mensais estimados

Valores oficiais consultados em 21/10/2026, para operação contínua durante o mês, em um workspace Hobby sem outros consumos, sem impostos ou câmbio:

| Item | Dimensionamento inicial | Estimativa mensal |
| --- | --- | ---: |
| Workspace Hobby | Uma pessoa administradora | US$ 0 |
| Web service | Uma instância, 0,5 CPU e 512 MB | US$ 7,00 |
| PostgreSQL | 0,1 CPU, 256 MB e 1 GB de armazenamento | US$ 6,00 a US$ 6,30 |
| Disco persistente das fotos | 1 GB | US$ 0,25 |
| Domínio personalizado e TLS | Um domínio, dentro da franquia Hobby | US$ 0 adicionais |
| **Total de referência** | **Uma instância, antes de excedentes** | **US$ 13,25 a US$ 13,55/mês** |

Usar **US$ 13,55/mês** como estimativa conservadora e confirmar o valor no painel antes da contratação. A [página de preços](https://render.com/pricing) menciona 1 GB SSD incluído para PostgreSQL, mas o [guia oficial de custos](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses) manda somar US$ 0,30 por GB; a diferença é de US$ 0,30/mês no cenário. O preço não inclui registro ou renovação do domínio, impostos, tarifas de câmbio, possíveis custos de backup externo, jobs ou recursos extras. O Hobby inclui, por workspace, 5 GB de saída e 500 minutos de pipeline mensais; excedentes publicados são US$ 0,15/GB e US$ 5/1.000 minutos, respectivamente. Trabalhos avulsos têm cobrança própria por tempo de execução. Confirmar franquias já usadas e limites de gasto na conta. [Preços](https://render.com/pricing) e [jobs avulsos](https://render.com/docs/one-off-jobs).

Os planos gratuitos não são equivalentes para esta demonstração: a web gratuita dorme após inatividade e não aceita disco persistente; o PostgreSQL gratuito expira após 30 dias e não inclui backups. [Limitações dos planos gratuitos](https://render.com/docs/free).

## Fotografias e recuperação

O código atual usa armazenamento local, com chave opaca e reprocessamento da imagem. Montar o disco, por exemplo, em `/var/data`, com o diretório de fotos dentro dele, fora de `public/`. Conferir montagem, propriedade e permissões na instância Linux: definir `PHOTO_STORAGE_DIR` ou criar o diretório não prova que o volume está montado nem corrige permissões existentes. A aplicação grava arquivos novos com permissões restritas; as rotas conferem o proprietário ou o vínculo com a publicação ativa, e o perímetro também protege as fotos publicadas. Uploads aceitam JPEG, PNG e WebP dentro dos limites atuais e removem metadados. [Armazenamento atual](../src/lib/photo-storage.ts) e [autorização das fotos](../src/lib/photos.ts).

O disco preserva o conteúdo entre reinícios e deploys, tem snapshots diários retidos por pelo menos sete dias e fica limitado a uma instância; deploys com disco interrompem o serviço. A restauração do snapshot é integral e perde alterações posteriores. Apenas o caminho montado é persistente. O PostgreSQL pago oferece recuperação por ponto no tempo de três dias no Hobby, criando uma nova instância na recuperação. Os pontos de recuperação do banco e do disco não são coordenados: preparar e testar um procedimento de backup e restauração conjunto, inclusive o custo de eventual instância restaurada. Monitorar espaço; arquivos de revisões retidas e órfãos não são limpos automaticamente. [Discos](https://render.com/docs/disks) e [backups PostgreSQL](https://render.com/docs/postgresql-backups).

Alternativa futura: um bucket privado Cloudflare R2 Standard inclui 10 GB-mês, 1 milhão de operações de classe A e 10 milhões de classe B por mês; acima disso, os preços publicados são US$ 0,015/GB-mês, US$ 4,50/milhão de operações A e US$ 0,36/milhão B. A saída direta do R2 não é cobrada, mas o tráfego que passar pelo Render ainda pode contar na franquia dele. O serviço exige conta e ativação de cobrança; confirmar os requisitos e custos no momento da contratação. [Preços R2](https://developers.cloudflare.com/r2/pricing/) e [ativação](https://developers.cloudflare.com/r2/get-started/).

O R2 não é uma opção configurável apenas por variável no código atual: exige implementar e testar outro adaptador de armazenamento, controle de acesso, credenciais e política de recuperação. Links assinados são credenciais temporárias reutilizáveis até expirar e não devem contornar o perímetro. Para os três exemplos e menor esforço imediato, recomenda-se o disco do Render; reavaliar objetos privados quando escala, operação ou disponibilidade justificarem a alteração. [URLs assinadas R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Segurança e bloqueios

- O [perímetro HTTP Basic](../src/proxy.ts) já envolve rotas e assets e falha fechado em configuração inválida na homologação. Cadastro é bloqueado; o login permite apenas a conta fictícia configurada. A sessão usa cookie `Secure`, `HttpOnly` e `SameSite=Lax`, e as ações conferem a origem `APP_URL`. Fotos do snapshot publicado podem ser vistas após o Basic; fotos privadas exigem autorização. Esses comportamentos foram testados localmente, mas ainda precisam ser conferidos ponta a ponta na infraestrutura real.
- O login da aplicação limita tentativas por conta e globalmente; **o HTTP Basic não possui esse limite**. Usar credenciais aleatórias e independentes, mas isso não substitui a mitigação. Antes de compartilhar, escolher, implementar quando necessário e testar uma limitação adequada que cubra todos os caminhos e hosts, sem confiar em cabeçalhos de cliente falsificáveis. Regras de IP para web no Render não estão disponíveis no Hobby; regras para o PostgreSQL estão. Proteção apenas no domínio próprio não cobre por si só o endereço `onrender.com`. [Regras de entrada](https://render.com/docs/inbound-ip-rules).
- **Atualização C-013B.1:** a observação anterior registra o estado da C-013A. Um limitador Basic com estado persistente está em preparação na branch de trabalho e requer a variável `NOIVARA_HOMOLOG_RATE_LIMIT_DIR`; consulte [C013B1-SEGURANCA-LINUX.md](C013B1-SEGURANCA-LINUX.md) para a configuração atual, a validação pendente e o controle independente contra abuso a definir antes da exposição e comprovar no serviço real antes de compartilhar. A versão Node atualmente proposta também substitui a candidata histórica deste plano devido às [correções de segurança de 21/10](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). Os demais itens deste plano permanecem como registro histórico.
- Uma alternativa a estudar é uma regra de limitação em borda para o domínio próprio, com `onrender.com` desabilitado depois da conexão do domínio e proteção da origem contra contorno. Verificar plano, configuração real e efeitos em páginas com muitos assets; a regra gratuita do Cloudflare conta requisições por IP e tem limitações, não equivalendo a um contador preciso de falhas Basic. Desabilitar `onrender.com`, isoladamente, não prova que não exista acesso direto à origem. Se for adotado Cloudflare Access, a origem precisa validar obrigatoriamente a assinatura, audiência, emissor e expiração do token, ou usar proteção equivalente. Outra alternativa é implementar e testar na aplicação um limitador para o perímetro, em branch separada. Enquanto o endereço padrão estiver ativo, ele também precisa de cobertura; não presumir que WAF ou proteção DDoS genérica resolvam esse ponto. [Limites do WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/), [validação de tokens Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) e [domínios Render](https://render.com/docs/custom-domains).
- Usar segredos novos, independentes, aleatórios e apenas no gerenciador de segredos do provedor; não registrá-los em Git, logs ou conversa. O banco, a conta e os casamentos da apresentação devem ser fictícios e isolados. Conferir direitos da foto do hero para apresentação online e das demais imagens antes do upload. Não ativar pagamentos ou integrações reais.
- Validar acesso anônimo, sessão expirada, outras contas em ambiente de teste separado, cadastro bloqueado, sites, imagens e assets; verificar `Origin`/CSRF e cabeçalhos manipulados atrás do proxy. Desativar o endereço `onrender.com` quando possível e testar resposta 404; enquanto ativo, validar o mesmo perímetro nele. O padrão TCP do Render não exige liberar uma rota HTTP pública de health check. [Health checks](https://render.com/docs/health-checks).

## Configuração de ambiente

Nomes e marcadores apenas; valores reais devem ficar no provedor, nunca no repositório:

```text
NODE_VERSION=<versao-node-validada>
NODE_ENV=<modo-producao>
DATABASE_URL=<url-interna-do-postgresql-exclusivo-com-tls>
APP_URL=<origem-https-da-demonstracao>
PHOTO_STORAGE_DIR=<diretorio-no-volume-privado>
NOIVARA_HOMOLOGACAO=<modo-de-homologacao>
NOIVARA_HOMOLOG_USUARIO=<usuario-do-perimetro>
NOIVARA_HOMOLOG_SENHA=<senha-aleatoria-do-perimetro>
NOIVARA_HOMOLOG_CONTA_ID=<identificador-da-conta-ficticia>

# Somente no bootstrap, com o destino previamente conferido:
NOIVARA_HOMOLOG_DATABASE_NAME=<nome-interno-confirmado>
NOIVARA_HOMOLOG_CONTA_SENHA=<senha-aleatoria-distinta-da-conta>

# Fornecidas pela plataforma, conferir sem sobrescrever:
RENDER=<indicador-da-plataforma>
PORT=<porta-fornecida-pela-plataforma>
```

Fixar como candidata a versão Node 24.21.0 usada na validação local e verificar instalação e build em Linux; a versão padrão da Render muda com o tempo. A homologação exige modo ativo, ambiente de produção, ID no formato `c011_` seguido de 32 hexadecimais minúsculos e nome interno do banco no formato `noivara_c011_` seguido de 8 a 32 hexadecimais minúsculos. O segredo da conta serve apenas para o bootstrap e deve ser removido de seu ambiente após o uso. Os detalhes e restrições de comprimento estão em [DEMONSTRACAO-C011.md](DEMONSTRACAO-C011.md). [Versão do Node na Render](https://render.com/docs/node-version).

## Build, migrations e dados fictícios

O projeto usa Next.js 16.4.2, React 19.2.0, Prisma 6.19.3 e Sharp 0.35.5. Comandos propostos para Linux, ainda não validados no provedor:

```sh
# Build: o Prisma CLI está em devDependencies
npm ci --include=dev && npm run db:generate && npm run build

# Start: ouvir na porta fornecida pela plataforma
npm run start -- --hostname 0.0.0.0 --port "$PORT"

# Somente após autorização e conferência do banco novo:
npx prisma migrate deploy
npx prisma migrate status
```

Existem quatro migrations versionadas. Não usar `npm run db:migrate` na homologação: ele chama `prisma migrate dev`. Não executar migrations automaticamente no pre-deploy; confirmar a identidade do banco isolado e obter autorização específica antes de executar os comandos. A CLI Prisma deve estar disponível no ambiente de execução. O pre-deploy e os jobs avulsos não acessam o disco da instância web. [Deploys](https://render.com/docs/deploys) e [jobs avulsos](https://render.com/docs/one-off-jobs).

Após conferir o destino e as migrations, executar uma única vez o [bootstrap C-011](../scripts/prepare-c011-demo.mjs), com seu argumento de confirmação e segredos em ambiente protegido. Ele verifica o nome interno, usuário, host, modo, tabelas vazias e checksums das quatro migrations; usa transação e não apaga nem sobrescreve dados. Cria uma conta fictícia, três casamentos publicados nos três templates e 18 presentes simbólicos, sem fotos nem pagamentos. Não tentar login antes: a gravação de tentativas impede o reconhecimento de banco vazio. Se houver falha ou resultado incerto, inspecionar o destino antes de repetir. Após concluir, remover o segredo temporário da conta, entrar pela origem configurada, enviar imagens autorizadas pela aplicação e republicar os três sites. O roteiro completo e as guardas constam em [DEMONSTRACAO-C011.md](DEMONSTRACAO-C011.md).

## Domínio e plano C-013B

Depois das aprovações necessárias e de configurar a proteção desde o primeiro deploy:

1. Confirmar conta Render, custo real, região, acesso limitado ao repositório e controle de abuso cobrindo também `onrender.com` desde o primeiro deploy. Se precisar de código, prepará-lo em branch própria e solicitar aprovação para publicar. Manter deploy automático desligado. Somente depois, criar o PostgreSQL exclusivo e o serviço pago com disco, segredos e perímetro já configurados; restringir a entrada externa no PostgreSQL.
2. Com autorização e identidade do banco conferida, aplicar as quatro migrations e executar o bootstrap; confirmar o resultado sem expor credenciais. Validar o perímetro e a limitação de tentativas antes de compartilhar.
3. Adicionar `demo.meucasamento.ia.br` ao serviço, conferir os registros existentes e, após autorização de DNS, configurar o CNAME apontando ao hostname informado pela Render. Conferir `CAA` e registros conflitantes. Verificar o domínio no painel; a Render emite e renova o certificado TLS e redireciona HTTP para HTTPS. Não modificar registros do domínio principal sem necessidade. [Domínio personalizado](https://render.com/docs/custom-domains) e [TLS](https://render.com/docs/tls).
4. Desabilitar `onrender.com` depois que o domínio próprio estiver pronto e confirmar 404. Testar bloqueio anônimo, credenciais independentes, origem/CSRF, fotos, persistência após reinício e redeploy controlado, restauração, três templates, presentes e financeiro fictício. Verificar o layout em desktop e celular e só então entregar o endereço e credenciais por canal seguro.

As estimativas não são contratação, e os resultados anteriores de build e testes locais não provam operação em Linux, Render ou domínio real. Caso a mitigação exija código, preparar e testar em branch própria e obter aprovação antes de publicar. A demonstração não é liberação de produção.
