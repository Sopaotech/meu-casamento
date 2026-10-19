# Wedding SaaS — primeira vertical

Aplicação em desenvolvimento local para cadastro, criação de um casamento, edição de texto, escolha de template, prévia privada e publicação. A solicitação atual autoriza o início do software; os documentos de G0/G1 existentes são históricos e permanecem intactos. Nenhum gate comercial ou financeiro foi aprovado por esta implementação.

## Situação

Este projeto é uma primeira implementação em andamento, **não está homologado nem pronto para produção**. Não use dados reais até validar o fluxo e os controles de segurança. Não há cobrança, presentes, RSVP, deploy ou integração financeira. Ainda não oferece verificação de e-mail, recuperação de senha, convites, múltiplos membros, RLS, auditoria, histórico acessível, nem política de retenção/exclusão. O criador é o único proprietário de cada casamento. As decisões comerciais, jurídicas e operacionais permanecem pendentes.

O código registra uma versão do template em cada publicação; futuras alterações do renderizador devem preservar o comportamento das versões já publicadas. A aplicação cria snapshots sem rota de edição e protege o vínculo da revisão ativa ao casamento, mas um usuário com privilégios diretos de escrita no banco ainda poderia alterar as revisões. Não há garantia de imutabilidade física nem de idempotência contra publicações duplicadas.

Novos uploads são reprocessados pelo `sharp` e armazenados em disco privado, por padrão em `.local-media/`, fora de `public/`; PostgreSQL guarda metadados e relacionamentos. São aceitos JPEG, PNG e WebP estáticos, decodificados, com até 5 MiB e 20 milhões de pixels, até 20 fotos no rascunho e até 100 fotos distintas referenciadas pelo rascunho e pelas revisões preservadas. A orientação visual é aplicada e os metadados são removidos. Fotos removidas sem referências são candidatas à limpeza e não contam no limite de 100, mas nenhuma limpeza automática está implementada: o consumo de disco pode crescer. Todas as revisões preservadas protegem suas fotos. Somente o proprietário pode acessar fotos privadas; visitantes acessam fotos presentes na publicação ativa. Despublicar ou republicar altera o acesso público, e as respostas não são armazenadas em cache.

A migration aditiva conserva bytes eventualmente existentes no PostgreSQL. Fotos legadas são transferidas individualmente, após acesso autorizado, e os bytes no banco são retirados apenas depois de gravados no disco; uma falha mantém os dados antigos. Fotos legadas nunca acessadas continuam no banco e precisam de um procedimento de migração e verificação antes da remoção definitiva da coluna. Não há confirmação de que a migration anterior tenha sido aplicada no banco persistente configurado. Arquivos órfãos de uma operação interrompida também aguardam um procedimento seguro de reconciliação. Faça backup coordenado do banco e do diretório de mídia; não exponha esse diretório nem conceda acesso a outros usuários locais.

O login usa hash de senha, sessão opaca com hash persistido e cookie protegido, verificação de origem e limite persistente de tentativas. O cadastro ainda pode permitir inferir se um e-mail existe. O limite global pode bloquear usuários legítimos sob abuso; faltam proteção de borda, revisão independente e testes mais completos de autenticação, sessão e CSRF. Estes controles são uma base experimental, não uma garantia de segurança de produção.

O projeto fixa `deepmerge-ts` em 8.0.2 para corrigir um alerta de segurança em dependência da configuração do Prisma 6. Esse override substitui a versão originalmente exigida pelo Prisma; foi verificado com geração, migração, testes e compilação, mas deve ser reavaliado em futuras atualizações do Prisma.

## Preparar localmente

Requisitos: Node.js compatível com Next.js 16, npm, PostgreSQL e, opcionalmente, Docker Desktop com o daemon iniciado. Os exemplos abaixo são para PowerShell e um banco **exclusivo de desenvolvimento**; nunca use um banco existente com dados importantes para testes ou migrações experimentais.

1. No diretório do projeto, execute `npm install` se as dependências ainda não estiverem instaladas. Se a unidade C: estiver sem espaço, configure antes uma pasta de cache e uma pasta temporária com espaço em D: (`$env:npm_config_cache` e `$env:TEMP`/`$env:TMP`) para esse processo.
2. Confira `.env`; se ainda não existir, copie `.env.example` para `.env`. Substitua os marcadores de `DATABASE_URL` por usuário, senha e banco do ambiente dedicado, e revise `APP_URL` e, se necessário, `PHOTO_STORAGE_DIR` (caminho absoluto privado fora de `public/`). Os marcadores são apenas exemplos e não são credenciais utilizáveis. O endereço de `APP_URL` precisa corresponder exatamente à origem do navegador. Configure permissões do diretório para a conta que executa o servidor; em Windows, ajuste as ACLs se necessário. Não compartilhe `.env`.
3. Para criar um banco novo e exclusivo com Docker Compose, defina no `.env` ignorado pelo Git `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`, preenchendo os três valores e usando credenciais próprias; os valores precisam corresponder aos de `DATABASE_URL`. Use codificação de URL quando a senha contiver caracteres especiais. Com Docker Desktop iniciado, confira que `127.0.0.1:5432` está livre e execute `docker compose up -d db`. O Compose cria um volume local persistente. Essas variáveis inicializam um volume PostgreSQL novo: alterá-las não modifica usuários, senhas ou bancos em um volume existente. Não recrie containers nem altere um banco persistente sem entender e autorizar a operação. Alternativamente, use uma instalação PostgreSQL local e crie um banco vazio exclusivo para o projeto.
4. Execute `npm.cmd run db:generate`. Antes de executar `npx.cmd prisma migrate deploy`, identifique o banco e obtenha autorização específica para aplicar as migrations ao banco principal; revise o SQL e preserve os dados existentes. Para futuras alterações do esquema, `npm.cmd run db:migrate` cria migrações em desenvolvimento. Não use reset.
5. Execute `npm run dev` e acesse `http://127.0.0.1:3000`. Crie uma conta e um casamento, salve o conteúdo, veja a prévia e publique. Editar novamente o rascunho não deve mudar o site público até republicar. O servidor de desenvolvimento escuta apenas neste computador.

O modo `npm start` configura cookies seguros e exige uma `APP_URL` HTTPS; portanto, não oferece login sobre HTTP local. O exemplo HTTP é exclusivo para `npm run dev`.

## Verificação

Execute `npm run typecheck`, `npm test` e `npm run build`. Os testes de integração com PostgreSQL ficam desativados por padrão e exigem um banco **separado e descartável** com nome terminado em `_test`, já preparado com as mesmas migrações. No PowerShell, defina `TEST_DATABASE_URL` com a URL desse banco e `RUN_DATABASE_TESTS=1`, então execute `npm test`. Os testes removem apenas os registros que criam, mas o banco precisa ser exclusivo para testes. Não aponte para um banco com dados reais.

Os resultados e limitações da missão atual estão em `docs/PROJECT-STATUS.md`. Refaça a integração em PostgreSQL isolado e complemente com verificações de autenticação e acesso de uma segunda conta pela interface antes de homologar.

## Organização

`src/app` contém páginas e ações de servidor; `src/lib` concentra validação, autenticação, acesso aos dados e a interface de armazenamento; `src/components` contém os componentes visuais; `prisma` contém o esquema de dados; `tests` contém testes de conteúdo e de isolamento/publicação. PostgreSQL e o diretório privado de mídia formam juntos a fronteira persistente; não há serviço externo de armazenamento nesta versão.

## Reversão

Os arquivos do produto ficam fora de `docs/`. Para reverter, interrompa a aplicação e remova somente os arquivos e diretórios de produto criados nesta etapa após verificar seus caminhos. Não remova `docs/` nem bancos ou volumes sem confirmar seu conteúdo: um volume pode conter dados inseridos depois. Não há deploy para desfazer.
