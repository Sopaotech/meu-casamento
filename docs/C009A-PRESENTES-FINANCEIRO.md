# C-009A — presentes e preparação financeira

## Situação atual

O catálogo contém contribuições simbólicas, não produtos vendidos ou entregues pelo Meu Casamento. Os noivos podem criar e editar presentes, informar um valor sugerido em centavos ou deixar o valor livre, alterar a ordem, ocultar, arquivar e enviar uma imagem. Arquivamento preserva o registro e seu histórico. Não existe contribuição, cobrança ou pagamento executável nesta missão. A contribuição parcial em relação a uma meta foi avaliada, mas não é calculada nem ofertada: requer definição do objetivo e dados financeiros verificados do provedor.

Cada alteração do catálogo incrementa a versão do rascunho. A publicação, serializada com essas alterações, grava um snapshot dos presentes ativos. A página pública apresenta apenas o snapshot da revisão ativa; ocultação, arquivo, alteração de preço e imagem entram em vigor após republicação. Sem publicação, não há lista pública. Fotografias de presentes usam armazenamento privado e um acesso próprio: apenas o proprietário ou uma referência na revisão ativa do mesmo casamento autoriza a leitura. Arquivos enviados são validados e reprocessados pelo mesmo mecanismo das fotos dos noivos; imagens antigas e revisões são preservadas. O limite é de 100 presentes não arquivados e 200 imagens preservadas por casamento; não há limpeza automática de arquivos órfãos.

O painel real apresenta somente a situação de espera pela integração. O exemplo visual em `/demonstracao-local/financeiro` usa valores fixos em memória, rotulados permanentemente como fictícios; não lê nem escreve contribuições, contas, saldos ou transferências. Essa rota só funciona em desenvolvimento com host local. O servidor precisa permanecer vinculado a `127.0.0.1` e sem proxy/rede externa, pois o cabeçalho Host não autentica a origem.

## Modelo futuro a validar

`GiftItem` e seu histórico `GiftAudit` foram implementados; `GiftImage` guarda a referência à imagem, e `Publication.gifts` guarda o snapshot. As seguintes entidades foram avaliadas, mas não foram criadas nem devem ser tratadas como registros financeiros implementados:

- **GiftContribution:** referência imutável ao casamento e ao presente, valor em centavos, identificação de convidado apenas quando informada e autorizada, estado da contribuição e referência externa. Preservar o valor e o nome no momento da solicitação mesmo após edição ou arquivo do presente.
- **ProviderAccount:** vínculo entre casamento e conta do provedor, identificação externa, situação de cadastro e histórico, sem senha ou credencial submetida pelo navegador como prova de propriedade. Garantir unicidade conforme as regras confirmadas do provedor.
- **PaymentAttempt:** tentativas vinculadas à contribuição e conta do mesmo casamento, com referências externas únicas, valor, estado de cobrança e chave de idempotência. Não aceitar confirmação ou valor financeiro do navegador como evidência.
- **PaymentEvent:** eventos autenticados, com identificador externo único no escopo correto do provedor, processamento idempotente, trilha de auditoria e conciliação com a cobrança. Definir proteção e retenção de dados antes de guardar payloads.
- **TransferRecord:** referência e estado de transferência informados pelo provedor; não representar uma carteira ou transferência executada pelo Meu Casamento.

Pagamento, liquidação e transferência são estados distintos. Os vínculos deverão usar chaves compostas ou restrições equivalentes para impedir referências entre casamentos; valores monetários serão inteiros e regras de estados, duplicidade, cancelamento, estorno e disputas deverão ser testadas contra evidência do provedor. O contrato TypeScript em `src/lib/financial/provider.ts` é apenas uma interface interna: Asaas é prioritário para a prova de conceito e Mercado Pago é alternativa, sem implementação ou alegação de compatibilidade já verificada.

## Fluxo proposto para próxima missão

1. Os noivos iniciam a vinculação com um provedor autorizado.
2. O provedor conduz o onboarding e a verificação de identidade (KYC).
3. O backend recebe e associa a identificação e o estado da conta ao casamento correto.
4. O convidado escolhe um presente.
5. O backend cria uma contribuição pendente com valor validado no servidor.
6. O provedor cria a cobrança sob a conta vinculada aos noivos, se esse modelo for aprovado e suportado.
7. O convidado paga no fluxo autorizado do provedor.
8. Um webhook autenticado informa a mudança de estado.
9. O backend verifica o evento e a cobrança, registra idempotentemente e concilia; resposta do navegador nunca confirma pagamento.
10. O painel apresenta valores confirmados e situação financeira com origem verificável.
11. Transferências permaneceriam sob controle do provedor; o Meu Casamento não manteria custódia nem carteira própria. O modelo permanece sujeito a aprovação.

Antes de qualquer prova de conceito ou operação, confirmar com o provedor a viabilidade técnica do modelo de contas vinculadas, autenticação de webhooks, idempotência, tarifas, liquidação, acesso a saldos e extratos e tratamento de estornos. Permanecem pendentes as aprovações comercial, jurídica e regulatória, os direitos e consentimentos aplicáveis aos dados de convidados, retenção, controles operacionais e homologação. Não há chamada real ao Asaas ou Mercado Pago, credenciais reais, subcontas, Pix, split ou transferência nesta missão.

## Validação isolada

A descrição abaixo registra a preparação local da C-009A. A C-011D executou nova validação em outro banco descartável e removeu o container e a rede criados para essa verificação; não presuma que qualquer instância ou cópia de trabalho histórica esteja ativa. Confirme sempre o destino antes de executar comandos.

A migration `20261019020000_gifts` é aditiva. Foi aplicada apenas ao PostgreSQL descartável `wedding_c009a_test` em `127.0.0.1:55444`, junto das migrations anteriores. O banco persistente não foi migrado: não inicie este código contra ele antes de uma migração revisada, autorizada e acompanhada de backup. Há uma cópia isolada do código em `.tmp/c009a-dev-app` para a validação atual, pois outro servidor de desenvolvimento já estava usando o diretório padrão do Next. Essa cópia é um retrato dos arquivos, não acompanha edições posteriores. Em PowerShell, enquanto o container e essa cópia existirem:

Substitua os marcadores pelo usuário e pela senha já configurados no PostgreSQL descartável, codificando-os para URL quando necessário. Não altere a senha do banco.

```powershell
$env:DATABASE_URL = 'postgresql://<USUARIO_POSTGRES>:<SENHA_POSTGRES>@127.0.0.1:55444/wedding_c009a_test?schema=public'
$env:APP_URL = 'http://127.0.0.1:3111'
$env:PHOTO_STORAGE_DIR = 'D:\Wedding SaaS\.tmp\c009a-browser-media'
Set-Location 'D:\Wedding SaaS\.tmp\c009a-dev-app'
npm.cmd run dev -- --port 3111
```

Se a instância já estiver rodando, não é necessário iniciar outra. Em `http://127.0.0.1:3111/`, criem uma conta fictícia e casamento, abram a lista no painel, adicionem e revisem presentes, publiquem e abram o endereço `/s/<slug>` em sessão anônima. O painel real em `/painel/<id>/recebimentos` permanece em espera. O exemplo isolado é `http://127.0.0.1:3111/demonstracao-local/financeiro`. Os dados de cadastro criados manualmente nesse ambiente também são fictícios. Para executar o código atual diretamente na raiz em outro momento, interrompa primeiro o servidor anterior por meios apropriados e execute o mesmo comando a partir de `D:\Wedding SaaS` com essas variáveis de teste.

## Rollback

Reverter os arquivos da missão de forma seletiva após revisão humana, preservando mudanças anteriores; o código anterior pode ignorar as novas tabelas e a coluna aditiva. Não apagar tabelas, snapshots, histórico ou arquivos de mídia como parte de um rollback automático. Se o novo catálogo já tiver sido usado, antes de remover qualquer estrutura preparar backup consistente do banco e das mídias, inventariar dependências e dados, e aprovar um procedimento de migração ou arquivamento. O banco de teste e seu container só devem ser descartados após confirmar que não há dados a preservar e que o alvo é exclusivamente `wedding-c009a-test-postgres`.
