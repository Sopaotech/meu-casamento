# Estado do projeto — missão C-004B

Atualizado em 19/10/2026. Ambiente exclusivamente local; não houve deploy, commit, reset, limpeza em massa ou alteração de banco persistente nesta missão.

## Auditoria

- O repositório está em `D:\Wedding SaaS`, sem commits; todos os arquivos de projeto aparecem como não rastreados. Não é possível separar alterações antigas de um primeiro baseline por diff. O diretório oferece permissão de modificação para o ambiente de trabalho.
- `.env`, `.next`, `.tmp`, cache npm, dependências, arquivos incrementais e `.local-media` ficam fora do Git. `.env.example` contém valores de exemplo, que devem ser revisados antes de compartilhar. Documentos e demais arquivos existentes devem ser revisados por uma pessoa antes do primeiro commit.
- A implementação anterior gravava bytes originais no PostgreSQL. O banco configurado não estava acessível; não foi possível confirmar se a migration de fotos havia sido aplicada em algum armazenamento persistente.
- Não há script de lint configurado no projeto. A biblioteca `sharp` já existia; não foi instalada nenhuma dependência adicional.

## Fotografias

- Novos arquivos são decodificados e reprocessados, preservando a orientação visual e removendo metadados. Aceitam-se JPEG, PNG e WebP estáticos de até 5 MiB e 20 megapixels.
- `PhotoStorage` abstrai a gravação/leitura; a implementação local usa chaves aleatórias, diretório privado configurável por `PHOTO_STORAGE_DIR` e, por padrão, `D:\Wedding SaaS\.local-media` quando a aplicação é iniciada na raiz. Configure ACLs privadas no Windows. PostgreSQL registra chave, MIME, tamanho e relacionamentos.
- O rascunho admite até 20 fotos. O limite de 100 conta a união de referências do rascunho e das revisões retidas. Fotos removidas sem referência são candidatas à limpeza e não consomem essa cota; por segurança não há exclusão física automática nem limpeza em massa. O uso de disco pode crescer, inclusive por arquivos órfãos após falhas ou interrupções.
- A rota mantém acesso privado para o proprietário e público somente para fotos da revisão ativa; a prévia exige sessão e propriedade. O renderizador compartilhado mantém os três templates. Alterar o rascunho não altera a publicação ativa.

## Migração e preservação

- A migration `20261019000000_photos` permanece intacta. `20261019010000_photo_disk_storage` é aditiva: permite bytes antigos nulos, adiciona chave/tamanho e preserva fotos antigas.
- Depois que a migration for autorizada e aplicada, uma foto antiga é processada e transferida ao disco ao ser acessada por alguém autorizado; seus bytes no banco só são removidos após a gravação. Em falhas, os bytes antigos permanecem. Fotos legadas nunca acessadas permanecem no PostgreSQL; ainda é necessário um procedimento explícito de migração e conferência para esvaziar a coluna legada sem perda de dados. Não se deve remover a coluna enquanto houver bytes.
- Faça backup coordenado de banco e diretório de mídia. Interrupções podem deixar arquivos órfãos; a reconciliação e eventual remoção precisam conferir referências de todas as revisões e o resultado das transações antes de apagar qualquer arquivo. Não foi executada limpeza nesta missão.
- Não aplique migrations no banco principal sem autorização específica e sem confirmar seu destino, estado e backup. Não use bancos ou volumes de outros projetos.

## Verificação

- `npx.cmd prisma generate` e `npx.cmd prisma validate`: passaram.
- `npm.cmd run typecheck`: passou.
- `npm.cmd test`: 47 passaram, 3 testes de integração com PostgreSQL ficaram ignorados por ausência de banco isolado. Os testes de integração foram atualizados, mas precisam ser executados contra PostgreSQL de teste real antes da homologação.
- Lint: indisponível; não há script nem configuração de lint no projeto.
- `npm.cmd run build`: passou, incluindo compilação e verificação TypeScript do Next.js.

## Próximos passos

1. Disponibilizar PostgreSQL descartável exclusivo, aplicar as migrations nesse banco e executar a integração; conferir isolamentos, concorrência, falha de gravação, conversão legada e preservação de revisões.
2. Identificar o banco de desenvolvimento, revisar seus dados e obter autorização específica antes de aplicar migrations. Validar os fluxos no navegador com contas e fotos fictícias.
3. Planejar migração verificada das fotos legadas e reconciliação/limpeza por referências, com backups e sem remoção em massa não revisada.
4. Revisar o conteúdo que entrará no primeiro commit, inclusive documentação e `.env.example`, sem incluir credenciais, mídia privada ou arquivos locais.

Para executar a integração quando houver um PostgreSQL descartável dedicado, informe a URL de um banco cujo nome termina em `_test`. Em uma sessão PowerShell separada, confirme o destino antes de rodar:

```powershell
$env:TEST_DATABASE_URL = '<URL do PostgreSQL exclusivo terminado em _test>'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npx.cmd prisma migrate deploy
$env:RUN_DATABASE_TESTS = '1'
npm.cmd test
```

Esses comandos aplicam migrations ao banco indicado em `DATABASE_URL`; nunca substitua a URL pelo banco de desenvolvimento principal ou pelo banco de outro projeto. O diretório de mídia usado pelos testes de integração é criado em `.tmp` com nome exclusivo.

## Missão W-004 — validação local, 19/10/2026

- Docker Desktop saudável, com armazenamento em `D:\DockerData\DockerDesktopWSL`. O PostgreSQL descartável usa o container exclusivo `wedding-w004-test-postgres`, o volume `wedding_w004_test_pgdata` e o banco `wedding_w004_test`, na porta local 55443. Um segundo banco exclusivo, `wedding_w004_legacy_test`, foi usado para simular a evolução de dados legados. Os artefatos de teste foram preservados.
- As três migrations foram aplicadas ao banco de teste; `prisma validate`, `prisma migrate status` e a comparação do schema não mostraram diferenças. As constraints rejeitaram uma foto vinculada a casamento inexistente e uma foto sem bytes ou chave de armazenamento. A migration aditiva preservou os bytes de uma foto legada fictícia; o teste de integração também verificou sua migração para disco e falha de gravação.
- A suíte completa executou **50 testes aprovados, zero reprovados e zero ignorados**. Para respeitar a instrução de não apagar dados, cópias temporárias dos testes de integração e de armazenamento omitiram apenas as rotinas de limpeza; os corpos dos testes foram comparados aos originais. Typecheck e build passaram. Não há lint configurado.
- Uma instância isolada foi iniciada em `127.0.0.1:3104`, com mídia exclusiva em `.tmp\w004-browser-media-20261019`, fora de `public/`. Testes HTTP reais criaram duas contas e dois casamentos fictícios, fizeram login, enviaram JPEG, PNG e WebP e confirmaram a presença da galeria nas prévias dos três templates. Também verificaram publicação anônima, remoção apenas do rascunho, preservação da publicação anterior e republicação.
- A prévia retornou 200 para a proprietária, 404 para a outra conta e redirecionamento ao login para acesso anônimo. Fotos privadas de outra conta retornaram 404. A foto retirada do rascunho permaneceu física e publicamente disponível até a republicação; depois retornou 404 para visitantes e continuou acessível à proprietária. JPEG fictício com coordenadas GPS em EXIF foi gravado sem EXIF; o registro novo no banco não continha bytes.
- Arquivos disfarçados, truncados e acima de 5 MiB foram recusados em testes HTTP; os testes automatizados também cobriram megapixels, animação, metadados, caminhos e falhas no armazenamento. A imagem pública retornou `private, no-store` e `nosniff`.
- **Pendente:** não havia navegador conectado à sessão de automação, portanto o fluxo visual e interações reais no navegador não foram executados. As verificações HTTP não substituem essa etapa. O container persistente `wedding-w003c-postgres` estava parado, não foi iniciado nem alterado; o estado das migrations e dados nele continua desconhecido. Fotos legadas nunca acessadas ainda exigem um procedimento de migração verificada, e não há limpeza automática de candidatas ou órfãs.
- O repositório continua sem commits. `.env*` (exceto `.env.example`), `.tmp`, `.local-media`, `.next`, cache e dependências são ignorados. Antes do primeiro commit, revisar documentação, imagem pública, exemplos e o conteúdo staged para descartar dados privados.
