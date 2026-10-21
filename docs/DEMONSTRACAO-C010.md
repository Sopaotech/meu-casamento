# Demonstração local para Caio — C-010

Esta rotina cria três casamentos de exemplo, suas listas de contribuições simbólicas e uma conta fictícia. Nomes, datas, histórias, locais e valores são fictícios. As fotografias são ilustrativas; as pessoas retratadas não são os casais nomeados nem endossam o Meu Casamento. O módulo não cobra, recebe ou movimenta dinheiro. O painel local de dados simulados permanece identificado como **DADOS FICTÍCIOS — DEMONSTRAÇÃO**.

## Segurança e preparação

As instruções abaixo descrevem a preparação histórica da C-010. Antes de reutilizá-las, confirme que a instância e o banco dedicados ainda existem, estão isolados e correspondem ao destino indicado; não presuma que estejam em execução.

O script aceita exclusivamente `NODE_ENV=development` ou `test`, PostgreSQL em `127.0.0.1:55445/wedding_c010_demo_test` com o usuário `c010_demo`, `?schema=public`, o aplicativo em `http://127.0.0.1:3113` e confirmação explícita pelo argumento `--confirm-db=wedding_c010_demo_test`. Antes de escrever, confere os hashes das nove fotografias de origem, a identidade informada pelo PostgreSQL e eventuais colisões de conta e endereços. Se a conta existir, também exige a mesma senha fictícia; não troca senhas nem sobrescreve casamentos existentes, mesmo se editados ou incompletos. Uma interrupção pode deixar um exemplo incompleto, preservado para revisão manual.

Ele cria uma sessão aleatória no banco confirmado e só envia alterações ao aplicativo depois de verificar, com uma leitura autenticada, que o aplicativo usa esse mesmo banco. A conta é `demo-caio-c010@example.test`; a senha fictícia deve ser fornecida em `DEMO_PASSWORD` e não é impressa nem versionada. Não use uma senha real. Não use proxy externo nem exponha a demonstração na rede. Os exemplos só devem ser publicados no servidor local de demonstração.

Prepare separadamente um PostgreSQL descartável e exclusivo nesse endereço e banco, aplique nele as migrations já versionadas, e inicie uma instância de desenvolvimento também exclusiva, com `DATABASE_URL` apontando para esse banco, `APP_URL=http://127.0.0.1:3113` e `PHOTO_STORAGE_DIR` absoluto fora de `public/` e separado das mídias de outras instâncias. **A rotina não prepara o banco, não executa migrations nem altera o banco persistente.** Confirme o destino antes de qualquer operação de banco; nunca aponte este procedimento para um banco existente de produção ou de outro projeto.

Na preparação local de C-010, as migrations existentes já foram aplicadas ao container dedicado `wedding-c010-demo-postgres`. Se esse container estiver parado, inicie somente ele com `docker start wedding-c010-demo-postgres`. A instância criada usa uma cópia do projeto em `.tmp/c010-demo-app`, cujos arquivos não acompanham automaticamente mudanças futuras. Para reiniciá-la enquanto a cópia e o banco dedicados existirem, em uma nova sessão PowerShell:

Substitua os marcadores pelo usuário obrigatório informado acima e pela senha já configurada no PostgreSQL descartável, codificando-os para URL quando necessário. Não altere a senha do banco.

```powershell
$env:DATABASE_URL = 'postgresql://<USUARIO_POSTGRES>:<SENHA_POSTGRES>@127.0.0.1:55445/wedding_c010_demo_test?schema=public'
$env:APP_URL = 'http://127.0.0.1:3113'
$env:PHOTO_STORAGE_DIR = 'D:\Wedding SaaS\.tmp\c010-demo-media'
Set-Location 'D:\Wedding SaaS\.tmp\c010-demo-app'
npm.cmd run dev -- --port 3113
```

Use apenas as credenciais do PostgreSQL fictício local, nunca as de uma conta financeira ou do banco persistente. Não reutilize essas credenciais fora da demonstração.

As imagens de origem devem estar em `.tmp/c007-demo-source`. A lista de fontes, créditos, licenças, hashes usados pela rotina anterior e condições de uso estão em [Demonstração local C-007](DEMONSTRACAO-LOCAL.md). As fotos são enviadas pelos formulários da aplicação, reprocessadas e guardadas no armazenamento privado da instância, nunca copiadas para `public/`. Sua apresentação no site público depende da publicação do snapshot correspondente. A imagem de mesa é usada para ilustrar o jantar; todos os presentes representam contribuições simbólicas, sem produto ou serviço fornecido pelo Meu Casamento.

Com a instância e o banco isolados já em execução, configure em uma sessão PowerShell local a URL completa de demonstração, inclusive usuário, senha exclusiva do PostgreSQL e `?schema=public`, e uma senha **fictícia** de 12 a 72 bytes para a conta. Depois execute:

```powershell
$env:NODE_ENV = 'development'
$env:DEMO_APP_URL = 'http://127.0.0.1:3113'
$env:DEMO_DATABASE_URL = '<URL do banco PostgreSQL exclusivo C-010 com ?schema=public>'
$env:DEMO_PASSWORD = '<senha fictícia da conta de demonstração>'
node scripts/prepare-c010-demo.mjs --confirm-db=wedding_c010_demo_test
```

Execute a rotina novamente para conferir a idempotência: os exemplos existentes são preservados. Ela não apaga dados, não republica exemplos existentes e não cria transações financeiras. A criação de sessões necessárias à execução é limitada ao banco dedicado; registros de sessão e mídia não são removidos automaticamente.

## Roteiro de apresentação

1. Entre em `http://127.0.0.1:3113/entrar` com a conta fictícia e a senha definida para a demonstração.
2. No painel, escolha um dos casais e explore seu editor, prévia e lista de presentes.
3. Veja um dos sites já publicados em `/s/demo-c010-classico`, `/s/demo-c010-romantico` ou `/s/demo-c010-moderno`.
4. Abra **Presentes e recebimentos** pelo painel do casal: sem provedor vinculado, os dados reais estão indisponíveis.
5. Para mostrar apenas a proposta visual fictícia, abra `http://127.0.0.1:3113/demonstracao-local/financeiro`. Os valores são simulados e não pertencem ao casal nem são transações salvas.

Os endereços só funcionam enquanto a instância local isolada estiver ativa e depois que a rotina tiver sido concluída. Alterações nos presentes ou no site exigem republicação para aparecer no endereço público. Pagamentos estão em desenvolvimento e não há confirmação ou recebimento real.
