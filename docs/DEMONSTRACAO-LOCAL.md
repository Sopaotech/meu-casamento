# Demonstração local C-007

Os casais, histórias, datas e locais são fictícios. As fotografias são imagens de banco usadas apenas para ilustrar a apresentação; as pessoas retratadas não são os casais nomeados nem endossam o produto.

## Fontes das fotografias

As imagens abaixo foram obtidas em 19/10/2026 na Pexels. A [licença da Pexels](https://www.pexels.com/license/) permite seu uso e adaptação gratuitos, inclusive em sites e aplicativos comerciais; a atribuição é opcional. Não se deve sugerir endosso pelas pessoas ou marcas retratadas, vender cópias isoladas ou redistribuir as imagens como banco de fotografias. Outros direitos de terceiros podem ser aplicáveis; consulte também a [orientação comercial da Pexels](https://help.pexels.com/hc/en-us/articles/360042295214-Can-I-use-the-photos-and-videos-for-a-commercial-project).

| Arquivo de origem local | Fotógrafo e página da imagem |
| --- | --- |
| `classico-1.jpg` | [Dilara Doğar — casal em traje de casamento](https://www.pexels.com/photo/elegant-wedding-couple-in-stylish-attire-outdoors-30608511/) |
| `classico-2.jpg` | [Jhon Macias — alianças e buquê](https://www.pexels.com/photo/elegant-wedding-rings-on-a-floral-bouquet-36413331/) |
| `classico-3.jpg` | [Rene Terp — mesa com flores](https://www.pexels.com/photo/wedding-table-with-flower-bouquet-10970244/) |
| `romantico-1.jpg` | [Wesley Davi — cerimônia ao ar livre](https://www.pexels.com/photo/outdoor-wedding-ceremony-with-bride-and-groom-30588685/) |
| `romantico-2.jpg` | [Ali Akdemir — alianças e buquê](https://www.pexels.com/photo/elegant-wedding-rings-on-bridal-bouquet-36339472/) |
| `romantico-3.jpg` | [Monika Cichosz — rosas e alianças](https://www.pexels.com/photo/elegant-white-rose-bouquet-with-wedding-rings-36863759/) |
| `moderno-1.jpg` | [Alexander Mass — casal em traje de casamento](https://www.pexels.com/photo/couple-in-wedding-attire-standing-back-to-back-outdoors-33462162/) |
| `moderno-2.jpg` | [iris — buquê e alianças](https://www.pexels.com/photo/elegant-flower-bouquet-with-wedding-rings-close-up-36685996/) |
| `moderno-3.jpg` | [Burcufilms — detalhes de casamento](https://www.pexels.com/photo/elegant-wedding-details-with-rings-and-flowers-32106372/) |

Os originais baixados ficam em `.tmp/c007-demo-source`, ignorada pelo Git. O script confere seus hashes; se estiverem ausentes ou diferentes, interrompe antes de criar dados. Os uploads passam pela aplicação, são reprocessados e ficam no diretório privado da instância, fora de `public/`; o PostgreSQL armazena apenas metadados. A fotografia antiga `noivara-casal.webp` não é utilizada nesses sites fictícios. Seu uso na landing e a declaração de autorização do proprietário estão descritos em [C008-LANDING.md](C008-LANDING.md).

Para recuperar os arquivos de origem, os identificadores são os números ao final das URLs da tabela. A versão usada na demonstração foi obtida pelo padrão `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1400` e salva com o nome indicado. Caso a Pexels altere o conteúdo servido e o hash não coincida, revise novamente a imagem e sua licença antes de atualizar a rotina.

## Preparar os exemplos

O script atua somente na conta `w005-visual-1792422374972@example.test`, na instância `http://127.0.0.1:3104` e no PostgreSQL `127.0.0.1:55443/wedding_w004_test`. Exige confirmação explícita do nome do banco, ambiente de desenvolvimento ou teste e a senha dessa conta por variável de ambiente. Após o login, confere que a sessão pertence à conta no banco informado antes de criar os exemplos. Os slugs `demo-c007-classico`, `demo-c007-romantico` e `demo-c007-moderno` são reservados para esta rotina; se já existirem, são preservados, inclusive suas edições. Nenhum casamento existente é apagado ou sobrescrito. Se uma execução for interrompida durante a criação, o exemplo parcial será preservado e precisará ser completado manualmente.

Na sessão PowerShell em que o endereço do banco isolado e a senha fictícia forem conhecidos, configure `DEMO_DATABASE_URL` com a URL completa do banco W-004, incluindo `?schema=public`, e `DEMO_PASSWORD` com a senha da conta W-005. Não use `.env` do banco principal nem registre as credenciais em arquivos versionados. Confirme o destino antes de executar:

```powershell
$env:NODE_ENV = 'development'
$env:DEMO_APP_URL = 'http://127.0.0.1:3104'
node scripts/prepare-demo.mjs --confirm-db=wedding_w004_test
```

O script não executa migrations nem resets. É necessário que a instância isolada e seus arquivos de imagem estejam disponíveis. Ele publica somente os novos exemplos fictícios no servidor local; para outros ambientes, revise novamente as licenças e os direitos aplicáveis.
