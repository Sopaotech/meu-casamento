# G1 — Modelo econômico para validação comercial

**Estado:** proposta de trabalho de G1; números operacionais e decisões comerciais ainda não validados. **Data da consulta de preços:** 18/10/2026. Este documento é uma ferramenta de raciocínio e preenchimento manual, não uma projeção aprovada, sistema financeiro, aconselhamento contábil ou prova de viabilidade. Não representa aprovação de G1 nem de qualquer gate posterior.

## Objetivo e limites

Testar se um site de casamento por assinatura pode gerar contribuição suficiente para pagar a aquisição de clientes e os custos da operação. A unidade básica é um casamento pagante; contar uma assinatura por contrato, mesmo que dois usuários participem. Separar coortes e canais, pois preço, permanência, custos e aquisição podem variar. Manter valores desconhecidos como **pendente**, não como zero.

A hipótese inicial de preço é **R$ 39,90 por mês**, e a de permanência é **seis meses**. Um cliente hipotético que pague integralmente seis mensalidades produziria **R$ 39,90 × 6 = R$ 239,40 em receita bruta contratual**, antes de impostos, tarifas, custos, descontos, reembolsos e inadimplência; não há churn nesse cenário determinístico. Não é LTV comprovado, receita líquida, lucro ou caixa garantido. Para uma coorte com cancelamentos, estimar separadamente a sobrevivência por mês; não aplicar novamente churn à duração média já ajustada por cancelamento.

Presentes pertencem ao fluxo dos noivos e não entram em receita, LTV, GMV da plataforma usado como receita, CAC ou margem da assinatura. A plataforma não deve custodiar esses recursos. As eventuais tarifas do provedor suportadas pelos noivos também não são receita da plataforma. Condições, segregação e aprovação do modelo pelo provedor e pelo jurídico permanecem pendentes; não há provedor aprovado nem integração autorizada por este documento. Custos da cobrança **da assinatura** são outra categoria: quando conhecidos, entram no custo variável aplicável ao serviço.

## Pesquisa pontual de referências

Amostra não exaustiva das páginas próprias das ofertas consultadas em 18/10/2026; preços, promoções, escopo e termos podem mudar. Valores não provam que há clientes, vendas ou demanda, e as ofertas têm recursos e monetização diferentes.

| Oferta | Preço publicado | Escopo e cuidado na comparação | Fonte |
|---|---|---|---|
| Casar.com | Site de casamento gratuito; lista de presentes com tarifa informada de 3,89% por presente; endereço personalizado opcional a partir de R$ 59,90. | É um comparador de site que monetiza de modo diferente. A tarifa é da oferta concorrente e não valida o modelo financeiro do Wedding SaaS; verificar termos, condições e custos totais na contratação. | [Site de casamento e preços Casar.com](https://www.casar.com/site-de-casamento) |
| Meu Casamento | Plano de organização gratuito; Premium mensal R$ 35,00/mês, trimestral R$ 89,90/trimestre, anual R$ 299,90/ano. | Ferramenta de organização de casamento, não uma equivalência comprovada de Site Builder. A página descreve RSVP, convidados, orçamento e outros recursos; comparar necessidades, condições de pagamento e renovação antes de inferir valor. | [Planos Meu Casamento](https://meucasamento.com/) |
| Casamentos.com.br | Site de casamento anunciado como gratuito. | Oferta de site ligada a um ecossistema maior; disponibilidade e recursos devem ser conferidos. Preço gratuito não significa ausência de outros custos ou limitações. | [Página Casamentos.com.br](https://www.casamentos.com.br/) |

**Pergunta comercial:** que benefício percebido justificaria uma mensalidade frente a opções gratuitas ou pacotes diferentes? Testar em entrevistas e, somente com autorização própria, em experimentos comerciais transparentes. Os valores acima não determinam o preço recomendado.

## Variáveis a preencher e como medi-las

Usar reais nominais, mesmo período, mesma coorte e data-base. Registrar fonte, tamanho da amostra, intervalo de observação e incerteza; distinguir proposta, cotação, teste e valor observado.

| Variável | Definição | Valor inicial / coleta proposta |
|---|---|---|
| `P_t` | Preço anunciado por assinatura no mês `t`. | R$ 39,90/mês é hipótese, não decisão validada. Registrar oferta e eventual alteração. |
| `D_t` | Descontos médios efetivos por cliente ativo pagante em `t`. | Pendente; registrar condições e valores efetivamente concedidos. |
| `U_t` | Reembolsos, estornos e falhas líquidas de recuperação por cliente ativo pagante em `t`. | Pendente; observar o período de maturação e evitar contagem dupla de cancelamentos. |
| `I_t` | Tributos incidentes estimados por cliente ativo pagante em `t`. | Pendente; obter orientação contábil, regime aplicável e registros. Não presumir alíquota. |
| `COGS_t` | Custo diretamente atribuível à prestação do serviço por cliente ativo pagante em `t`, conforme política documentada. | Pendente; cotações e medição de uso de hospedagem, armazenamento, tráfego e suporte diretamente necessário; identificar custos mínimos fixos separadamente. |
| `V_t` | Outros custos variáveis por cliente ativo pagante, não incluídos em `COGS_t` ou `I_t`. | Pendente; por exemplo, custo de processamento da cobrança da assinatura ou atendimento incremental se classificados fora de COGS. Registrar classificação sem duplicar. |
| `K` | Custo incremental inicial de ativação por novo cliente, não incluído em CAC, COGS ou V. | Pendente; apurar tempo e despesa de implantação, se houver. Não duplicar. |
| `CAC` | Despesas totais de aquisição atribuídas a um canal/coorte divididas por novos clientes pagantes adquiridos no período, alinhando janela e atribuição. | Pendente; custos de mídia, vendas, ferramentas e pessoas relevantes ÷ pagantes novos. Registrar orgânico, atribuição, gastos e defasagem. |
| `s_t` | Proporção esperada da coorte inicial que permanece pagante no mês `t`, com `s_1 = 1` para coorte definida na primeira cobrança. | Pendente; medir por coorte e mês, incluindo cancelamentos e inadimplência conforme definição, com prazo até reativação documentado. |
| `F_m` | Custos fixos da operação no mês `m`, excluídos os já contados em COGS, V, K e CAC. | Pendente; levantar salários, mínimos contratados, sistemas, jurídico e outras despesas; definir pró-labore e capacidade. |
| `N_m` / `A_m` | Assinaturas pagantes ativas / novos clientes pagantes adquiridos no mês `m`. | Pendente; contar em registros confiáveis e reconciliar cobrança, cancelamentos e reembolsos. |
| `q` | Taxa de conversão para cliente pagante, com funil e janela definidos. | Pendente; observar por canal após pesquisa ou experimento autorizado, acompanhando tamanho da amostra. |

Atribuir cada gasto uma única vez. Salários e plataforma podem ter parcela fixa e parcela diretamente variável; explicitar o critério de rateio. O tratamento de tributos, competência e custos deve ser revisado com profissional contábil; aqui é uma visão gerencial simplificada. A taxa de churn mensal por coorte é clientes que deixaram de pagar no mês ÷ clientes pagantes no início desse mês, após definir atraso, reativação, troca de plano e fechamento. Uma taxa média constante não substitui observação por mês e pode esconder cancelamentos concentrados perto do casamento.

## Fórmulas por cliente e por coorte

Para cada mês `t`, trabalhar com valores médios condicionados a estar ativo e pagante. `R_t = P_t − D_t − U_t − I_t` é receita gerencial após esses abatimentos, sem afirmar classificação contábil definitiva. Se reembolso ou falha já estiverem incorporados à definição de pagante ou ao preço realizado, não subtrair de novo. Se `R_t ≤ 0`, não calcular percentual de margem sobre ela.

- **Lucro bruto gerencial unitário:** `LB_t = R_t − COGS_t`; **margem bruta** = `LB_t / R_t`.
- **Contribuição unitária mensal:** `M_t = R_t − COGS_t − V_t`; **margem de contribuição** = `M_t / R_t`. Diferencia-se da margem bruta porque também deduz os outros custos variáveis. Não é lucro líquido e ainda não paga aquisição, custos fixos ou custos iniciais.
- **Contribuição esperada acumulada por cliente inicial em `H` meses:** `C_H = Σ(t=1..H) [s_t × M_t] − K`. Com valores por mês e sobrevivência observados ou explicitamente hipotéticos, `C_H` estima contribuição antes de aquisição e custos fixos. Se `K` já estiver embutido em `M_t`, não deduzir novamente.
- **Saldo unitário após aquisição até `H`:** `S_H = C_H − CAC`. O cliente cobre seu CAC e o custo de ativação se `S_H ≥ 0`; isso não prova lucro da empresa. `CAC máximo para equilíbrio unitário = C_H` apenas com os mesmos pressupostos, horizonte e custos; se `C_H ≤ 0`, não há CAC positivo recuperável nesse horizonte.
- **Payback unitário:** primeiro mês `H` em que `S_H ≥ 0`, calculado para cada coorte; se não ocorrer no período observado, registrar “não recuperado até H”, sem presumir o futuro. O cálculo acima usa valores de competência; para caixa, usar os recebimentos líquidos efetivos nas datas de entrada e saídas efetivas, e definir quando o CAC é pago.

Para cenário simplificado de seis pagamentos certos e margem mensal constante, `s_1 ... s_6 = 1`, demais meses fora do horizonte, logo `C_6 = 6 × M − K` e `S_6 = 6 × M − K − CAC`. Como `M`, `K` e `CAC` são desconhecidos, o equilíbrio não pode ser calculado. Para um cenário com cancelamento, preencher `s_t` separadamente e repetir `C_H`; não multiplicar uma duração média já observada por outra curva de churn.

**LTV:** somente chamar de estimativa de LTV quando definição, coorte, horizonte, descontos, reembolsos e medição estiverem explicitados. Diferenciar LTV de receita (`Σ s_t × R_t`) e LTV de contribuição (`Σ s_t × M_t − K`); ambos são estimativas, antes de CAC e custos fixos. Usar taxa de desconto apenas se houver premissa registrada, multiplicando cada mês por `1/(1+r)^t`, e chamar a versão de valor presente. A fórmula de seis mensalidades não estabelece nenhum LTV observado.

## Ponto de equilíbrio da operação e fluxo por período

Para um mês homogêneo de regime estável, `resultado operacional simplificado_m = N_m × M_m − A_m × (CAC_m + K_m) − F_m`, assumindo que `M_m` já reflete todas as despesas variáveis daquele mês, inclusive a prestação aos clientes antigos e novos, e que aquisição e ativação acontecem no mês. Resultado contábil e de caixa podem diferir; dividir em coortes quando margem ou preço forem diferentes. Essa fórmula considera CAC somente dos clientes adquiridos no mês e não o deduz novamente da contribuição de assinantes antigos.

Se `M_m > 0` e `A_m`, `CAC_m`, `K_m` e `F_m` forem conhecidos, **ativos necessários no mês**, nessa hipótese, são `arredondar para cima[(F_m + A_m × (CAC_m + K_m)) / M_m]`. É uma condição simultânea, não uma meta real: `N_m` e `A_m` estão ligados por retenção e aquisição, e capacidade/custos podem crescer. Se `M_m ≤ 0`, aumentar assinantes homogêneos não cobre os custos fixos. Não confundir esse equilíbrio mensal da operação com recuperação do CAC por cliente ao longo do tempo.

Para um fluxo **de caixa** mensal preencher: `caixa_final_m = caixa_inicial_m + recebimentos_da_assinatura_m − reembolsos_pagos_m − impostos_pagos_m − tarifas_da_cobrança_m − custos_do_serviço_pagos_m − ativação_paga_m − aquisição_paga_m − outros_custos_pagos_m`. Registrar datas e evitar deduções duplicadas; não somar presentes aos recebimentos da plataforma. Para período `1..H`, `variação_de_caixa = Σ entradas efetivas − Σ saídas efetivas`, e `caixa_final_H = caixa_inicial + variação_de_caixa`. Este fluxo não inclui investimento inicial, reservas, inadimplência futura ou impostos não pagos, salvo se forem informados; caixa positivo não prova viabilidade nem lucro contábil. Incluir investimento inicial e necessidade de capital de giro numa linha separada antes de decidir financiamento.

### Ficha manual de cenário e acompanhamento

Preencher uma linha por canal, coorte e horizonte; referências e valores estimados devem ter intervalo e data. Para cenários conservador, central e favorável usar premissas justificadas, ainda sem números inventados.

| Campo | Preenchimento |
|---|---|
| Responsável, data, fonte, estágio (hipótese/cotação/observado) | Pendente |
| Segmento, região, canal, oferta e horizonte | Pendente |
| `P_t`, descontos, reembolsos, inadimplência e tributos | Pendente |
| COGS, outros variáveis, ativação e alocação | Pendente |
| Gastos de aquisição, número de novos pagantes e janela de atribuição | Pendente |
| Sobrevivência `s_t` ou duração efetiva com método documentado | Pendente |
| `R_t`, margem bruta, `M_t` e margem de contribuição | Pendente |
| `C_H`, `CAC`, `S_H`, payback e dados censurados | Pendente |
| Ativos, novas aquisições, fixos, resultado mensal e caixa por período | Pendente |
| Fonte, evidências contrárias, intervalo e decisão decorrente | Pendente |

## Medição e decisões antes de prosseguir

1. Em entrevistas de descoberta, investigar situação, alternativas usadas, benefícios percebidos, restrições de privacidade e disposição de pagar; não tratar declarações isoladas como vendas. Documentar roteiro, recrutamento, viés, recusas e achados sem dados pessoais desnecessários.
2. Definir e aprovar desenho, prazo, amostra mínima, métricas e limites de um eventual teste de oferta antes de executá-lo. Registrar a proposta e qualquer compromisso de forma transparente; não coletar pagamentos ou criar produção sem autorização específica.
3. Solicitar cotações não vinculantes de hospedagem, mídia, suporte e cobrança de assinatura, com consumo e mínimos; estimar capacidade, impostos e mão de obra mediante fontes e revisão apropriadas.
4. Medir canais e conversão com consentimento e bases aplicáveis. Para permanência, aguardar coortes observadas até o horizonte relevante e explicitar dados incompletos; seis meses permanece hipótese até então.
5. Definir preço, formato mensal versus pacote, despesas assumidas, margem mínima, limite de CAC, reserva de caixa e critério de decisão com o responsável pelo negócio. Nenhum limiar é aprovado aqui.
6. Validar separadamente em G2 a viabilidade financeira dos presentes, segregação de recursos e aprovação do provedor, sem inferir aprovação de G2 a partir de pesquisas comerciais. Registrar questões jurídicas e tributárias para análise competente.

**Conclusão operacional:** a viabilidade econômica e o G1 permanecem pendentes até existir evidência suficiente e decisão humana registrada. Este documento não autoriza instalar dependências, implementar o produto, abrir contas, cobrar clientes ou avançar gates.