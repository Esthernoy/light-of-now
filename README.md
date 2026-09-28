# Light of Now — site da loja

Este é o site da Light of Now, pronto para ser publicado na internet no endereço
**https://lightofnow.com.br**.

O site é o mesmo que foi aprovado: mesmas cores, fotos, textos, preços e a mesma
sacola. A única diferença é por dentro: as fotos, que antes vinham "coladas" dentro de
um arquivo só de 1,1 MB, agora são arquivos separados. A página ficou com 24 KB e
abre mais rápido, principalmente no celular. Quem volta ao site nem precisa baixar
as fotos de novo, porque o navegador guarda as fotos.

Além disso, o site agora tem um **estoque de verdade**, o mesmo para todas as
clientes, e um **painel** em `lightofnow.com.br/admin`. No painel você vê os pedidos e
ajusta o estoque pelo celular.

---

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `site/` | **o site em si.** É isto que vai para a internet |
| `site/index.html` | a página (textos, cards, preços que aparecem na tela) |
| `site/loja.js` | o funcionamento da loja: sacola, frete, Pix |
| `site/admin/` | o painel da dona (`/admin`) |
| `netlify/lib/config.mjs` | **preços**, entrega e o estoque inicial |
| `netlify/functions/` | a parte que roda no servidor: estoque, pedidos, painel |
| `site/estilo.css` | as cores, as fontes e o visual |
| `site/img/` | as fotos e o logo |
| `site/compartilhar.jpg` | a imagem que aparece quando alguém manda o link no WhatsApp |
| `site/_headers`, `site/_redirects` | regras de cache e o redirecionamento do "www" |
| `netlify.toml` | diz à Netlify que a pasta a publicar é `site` |
| `ferramentas/` | o arquivo original e os programinhas que separaram as fotos |
| `testes/` | testes automáticos (para quem for mexer no código) |

---

## 1. Publicar o site na Netlify

A hospedagem escolhida é a **Netlify**. O plano grátis dá conta de uma loja deste
tamanho, o certificado de segurança (o cadeado do HTTPS) é gratuito e renovado
sozinho, e ela também guarda o estoque e os pedidos.

### Jeito recomendado: pelo GitHub (atualiza sozinho)

1. Crie uma conta grátis em https://github.com e outra em https://app.netlify.com
   (dá para entrar na Netlify com a própria conta do GitHub).
2. No GitHub, crie um repositório **privado** chamado `light-of-now` e envie esta
   pasta para ele (quem for te ajudar com o código faz isso em 1 minuto).
3. Na Netlify: **Add new project → Import an existing project → GitHub** e escolha
   o `light-of-now`.
4. Na tela de configuração, não precisa mudar nada (o `netlify.toml` já diz tudo).
   Clique em **Deploy**.
5. Em um minuto o site estará no ar num endereço provisório, parecido com
   `https://light-of-now-123abc.netlify.app`. **Anote esse endereço**, ele é usado
   no passo do domínio.

Daí em diante, toda mudança enviada ao GitHub é publicada sozinha.

> **Arrastar a pasta não serve mais.** Na Etapa 1 dava para publicar arrastando a
> pasta `site` em app.netlify.com/drop. Agora o site tem uma parte que roda no
> servidor (estoque e pedidos), e ela só é publicada pelo GitHub.

### 1.1. Criar a senha do painel (obrigatório)

O painel `/admin` só abre com uma senha. Ela **não fica escrita em nenhum arquivo**:
fica guardada na Netlify.

1. Na Netlify, abra o site → **Project configuration** → **Environment variables**
   → **Add a variable**.
2. Em **Key** escreva `ADMIN_SENHA`.
3. Em **Value** escreva uma senha com **pelo menos 10 caracteres** (dica: três ou
   quatro palavras juntas, como `vela-lavanda-mar-2026`). Marque a opção de valor
   secreto, se aparecer.
4. Salve e vá em **Deploys → Trigger deploy → Deploy site** para a senha valer.

Para trocar a senha, é só mudar o valor e publicar de novo. Quem estava logado
com a senha antiga é desconectado.

Se errar a senha 8 vezes seguidas, o painel bloqueia por 15 minutos.

---

## 2. Ligar o domínio lightofnow.com.br

O endereço oficial é **lightofnow.com.br** (sem www). Quem digitar
`www.lightofnow.com.br` é levado automaticamente para ele.

### 2.1. Na Netlify

1. Abra o site na Netlify → **Domain management** → **Add a domain**.
2. Digite `lightofnow.com.br` e confirme. A Netlify adiciona sozinha o
   `www.lightofnow.com.br` junto.
3. Confira que `lightofnow.com.br` aparece como **Primary domain**. Se não
   aparecer, clique nos três pontinhos ao lado dele → **Set as primary domain**.

### 2.2. No Registro.br — escolha UM dos dois caminhos

**Antes de mexer:** se você usa e-mail com @lightofnow.com.br, anote os registros
de e-mail (tipo **MX** e **TXT**) que aparecem hoje em **DNS → Editar zona** no
Registro.br. No caminho A eles precisam ser recriados na Netlify, senão o e-mail
para de chegar.

#### Caminho A (recomendado): deixar a Netlify cuidar do DNS

É o jeito em que o endereço sem www fica mais rápido, porque a Netlify entrega o
site do servidor mais perto de quem está acessando.

1. Na Netlify, em **Domain management**, clique em **Set up Netlify DNS** ao lado de
   `lightofnow.com.br` e siga as telas até aparecer a lista de **4 servidores**,
   parecidos com `dns1.p01.nsone.net`, `dns2.p01.nsone.net`, `dns3…`, `dns4…`.
   Copie exatamente os que aparecerem para você — os números mudam de conta
   para conta.
2. Entre em https://registro.br com seu usuário e clique no domínio
   **lightofnow.com.br**.
3. Na parte **DNS**, clique em **Alterar servidores DNS**.
4. Apague os servidores que estiverem lá e cole os 4 da Netlify, um em cada linha.
5. Clique em **Salvar alterações**.
6. Se você usava e-mail no domínio, recrie os registros MX/TXT anotados em
   **Netlify → Domains → lightofnow.com.br → DNS records → Add new record**.

#### Caminho B: continuar com o DNS do Registro.br

1. Entre em https://registro.br, clique no domínio e, em **DNS**, clique em
   **Editar zona** (se pedir, ative o **modo avançado**).
2. Clique em **Nova entrada** e crie estes dois registros:

   | Nome | Tipo | Dados |
   |---|---|---|
   | *(deixe em branco)* | **A** | `75.2.60.5` |
   | `www` | **CNAME** | o endereço provisório anotado no passo 1, **sem** `https://` (ex.: `light-of-now-123abc.netlify.app`) |

3. Se já existir outro registro **A** sem nome ou um **CNAME** para `www`, apague-o
   (deixe os de e-mail, MX e TXT, como estão).
4. Clique em **Salvar alterações**.

### 2.3. Esperar e conferir

- A mudança leva de alguns minutos a **24 horas** para valer em toda a internet.
- Quando valer, a Netlify emite o certificado sozinha (**HTTPS → Certificate**).
  Se depois de 24 horas ainda aparecer erro de certificado, clique em
  **Verify DNS configuration** e depois em **Provision certificate**.
- Para conferir: abra https://lightofnow.com.br e https://www.lightofnow.com.br —
  os dois devem terminar em `https://lightofnow.com.br`, com o cadeado.

*(Fontes conferidas em setembro/2026: documentação da Netlify —
"Configure external DNS for a custom domain" e "Set up Netlify DNS".)*

---

## 3. O painel: pedidos e estoque

Abra **https://lightofnow.com.br/admin** no celular e entre com a senha.
Dica: salve o painel na tela inicial do celular (no Chrome: menu ⋮ → *Adicionar à
tela inicial*). Ele continua logado por 7 dias.

### Pedidos

Cada pedido feito no site aparece aqui, o mais novo em cima, com: número
(LON-XXXXX), cliente, WhatsApp (toque para abrir a conversa), e-mail, entrega ou
retirada, endereço, velas, frete e **o total que a cliente deve ter pago no Pix**.

- **Aguardando**: a cliente fez o pedido e recebeu o Pix.
- Quando ela toca em "Já paguei", aparece a faixa verde *"A cliente avisou que
  pagou"*. **Isso não quer dizer que o dinheiro caiu.** Confira no app do banco.
- **Pago**: toque depois de ver o Pix na conta.
- **Entregue**: toque quando a vela chegar ou for retirada.
- **Cancelar**: as velas daquele pedido **voltam sozinhas para o estoque**. O
  cancelamento não pode ser desfeito.

Os filtros no alto mostram só os pedidos *em aberto* (aguardando ou pago), só os
*aguardando pagamento*, ou *todos*.

**Importante:** as velas ficam reservadas desde o momento do pedido. Se uma
cliente fizer o pedido e não pagar, **cancele o pedido**, senão aquelas velas
continuam contando como vendidas.

### Estoque

Uma linha para cada essência e tamanho, com **−** e **+**.

- Fez velas novas? Toque em **+** uma vez para cada vela.
- Vendeu fora do site (feira, Instagram) ou uma quebrou? Toque em **−**.
- Vendas pelo site **já descontam sozinhas**. Não precisa mexer.
- Quando chega a **0**, o tamanho aparece **riscado** no site para todo mundo.
  As clientes nunca veem os números.

### E se duas pessoas comprarem a última vela ao mesmo tempo?

Só uma consegue. A outra volta para a sacola com o recado: *"Enquanto você
escolhia, a última unidade de … foi vendida. Atualizamos sua sacola…"*. A sacola
dela é ajustada sozinha e ela pode seguir com o resto.

---

## 4. Mudar preços, entrega e dados do Pix

Para mudar um arquivo sem programa nenhum: no GitHub, abra o arquivo, clique no
lápis (*Edit*), faça a mudança e clique em **Commit changes**. Em um minuto está
no ar.

**Preços** — mude em **três** lugares, sempre com o mesmo valor:
1. `netlify/lib/config.mjs`, na linha `PRECOS`: é por ele que o servidor confere
   o total. Use ponto no lugar da vírgula: `39.50`.
2. `site/index.html`, nos quadros azuis de "Tamanhos e Valores" (procure por
   `39,50`, `R$&nbsp;49,90` etc.): é o que aparece na página.
3. `site/loja.js`, na linha `PRECOS`: só é usado se o servidor estiver fora do ar.

**Entrega** (faixas por distância, frete grátis): em `netlify/lib/config.mjs`
**e** em `site/loja.js`, na parte `ENTREGA`. Os dois precisam ficar iguais: o
site mostra a conta para a cliente e o servidor confere.

**Pix** (chave, nome, cidade): em `site/loja.js`, na parte `PIX`.

**Estoque**: não se muda mais em arquivo. Use o painel. *(O `ESTOQUE_INICIAL`
de `config.mjs` só vale na primeiríssima vez que o site roda.)*

---

## 5. Se algo parar de funcionar

| O que aconteceu | O que fazer |
|---|---|
| O site não abre pelo domínio, mas abre pelo endereço `.netlify.app` | É o DNS. Confira o passo 2.2 no Registro.br. Se mudou há menos de 24 h, espere |
| Aparece aviso de "conexão não segura" | Netlify → Domain management → HTTPS → **Verify DNS configuration** e **Provision certificate** |
| Mudei algo e não apareceu | Na Netlify, veja em **Deploys** se a última publicação ficou verde. No celular, feche e abra a página de novo |
| O frete não calcula | O frete usa serviços gratuitos de CEP. Se todos estiverem fora do ar, o site mostra "a combinar" e a cliente segue a compra normalmente |
| O e-mail do pedido não chegou | O pedido também vai pelo WhatsApp. Confira a conta do EmailJS (limite do plano grátis) |
| O site inteiro saiu do ar | Na Netlify → **Deploys**, clique numa publicação antiga que funcionava → **Publish deploy**. Ela volta na hora |
| O painel diz "a senha do painel ainda não foi configurada" | Falta a variável `ADMIN_SENHA` (passo 1.1), ou ela tem menos de 10 caracteres |
| O painel diz "Muitas tentativas erradas" | Espere 15 minutos. Se esqueceu a senha, troque em Environment variables (passo 1.1) |
| Um pedido chegou pelo WhatsApp mas não aparece no painel | O servidor estava fora do ar naquela hora. Para a cliente, nada muda: o Pix aparece e o pedido chega pelo WhatsApp e pelo e-mail. Só que ele **não desconta o estoque**: tire as velas com o botão **−** |
| Aparece a faixa amarela *"entrega calculada só no celular da cliente"* | Os serviços de CEP não responderam ao servidor. O valor veio do celular dela; confira se faz sentido |
| Muitos pedidos falsos | Cada pessoa (endereço de internet) pode fazer até 8 pedidos por hora. Cancele os falsos no painel e o estoque volta |

---

## Para quem for mexer no código

- O site continua **estático** (HTML, CSS e JS, sem etapa de montagem).
- As imagens são os **mesmos bytes** do arquivo original (nada foi recomprimido);
  o nome leva um pedaço do hash do conteúdo, por isso o cache de 1 ano é seguro.
- `ferramentas/extrair.py` refaz a separação a partir de um arquivo único novo;
  `ferramentas/imagem_compartilhar.py` refaz a `compartilhar.jpg`.
- **Servidor**: Netlify Functions (`netlify/functions`, formato v2) + Netlify Blobs.
  O estoque inteiro fica numa chave só (store `loja`, chave `estoque`); toda mudança
  lê com etag e grava com `onlyIfMatch`, repetindo se outra gravação chegou antes.
  Por isso um pedido de várias velas é reservado inteiro ou nada, e cancelar o
  mesmo pedido várias vezes devolve as velas uma vez só. Os pedidos ficam no store
  `pedidos`, um por chave (`LON-XXXXX`, criada com `onlyIfNew`).
- O servidor **recalcula** o total: preço de `config.mjs` e frete pelo CEP (a mesma
  conta do site, com os serviços de CEP consultados em paralelo para caber nos
  10 s da função). Se nenhum responde, aceita a taxa do navegador só se for um
  valor de faixa válido, e marca o pedido.
- `/api/estoque` nunca devolve mais do que 10 por tamanho (`TETO_VISIVEL`).
- Se o servidor não responder, o site segue como antes (Pix estático e pedido
  pelo WhatsApp), para a loja nunca parar.
- Variáveis de ambiente: `ADMIN_SENHA` (obrigatória, ≥ 10 caracteres) e
  `LIMITE_PEDIDOS_HORA` (opcional, padrão 8).
- Rodar em casa: crie um `.env` (não vai para o GitHub) com
  `ADMIN_SENHA=senha-de-teste-local-123` e `LIMITE_PEDIDOS_HORA=1000`, e então:

  ```bash
  npm install && npm --prefix testes install && testes/node_modules/.bin/netlify dev --offline --port 8888
  ```

- Testes (precisam do Chrome instalado):

  | Arquivo | O que testa | Como rodar |
  |---|---|---|
  | `visual.js` | original × site, pixel a pixel, 1440 px e 390 px | `python -m http.server 8765` na raiz, depois `node visual.js` |
  | `fluxo.js` | compra com retirada e com entrega, frete, CRC e leitura do QR do Pix, página sem JavaScript; com servidor, também a "última vela levada por outra cliente" | sem servidor: `node fluxo.js` · com servidor: `URL=http://localhost:8888/ node fluxo.js` |
  | `atomico.test.mjs` | 50 pedidos simultâneos da última unidade (só 1 passa), cancelamentos simultâneos, +/− simultâneos | `node --test --experimental-test-module-mocks testes/atomico.test.mjs` (na raiz) |
  | `servidor.js` | login, estoque, validação, total recalculado, frete, status, cancelar | `node servidor.js` (local) ou `BASE=https://SEU-SITE.netlify.app SENHA=... node servidor.js` |
  | `admin-tela.js` | fotos do painel no celular | `node admin-tela.js` |

  **Atenção:** o simulador local de Blobs do `netlify dev` **não é atômico** (confere
  o etag e grava depois, sem trava). Por isso, no `localhost`, as disputas
  simultâneas do `servidor.js` só dão AVISO. A prova da lógica é o
  `atomico.test.mjs`, que usa um armazenamento que cumpre a gravação condicional. A
  prova na Netlify de verdade é rodar o `servidor.js` com `BASE=` apontando para uma
  publicação **de teste**: ele cria pedidos e mexe no estoque, então depois cancele
  os pedidos de teste ou apague os stores `loja` e `pedidos` em Netlify → Blobs.
- A chave do EmailJS que aparece em `loja.js` é a **chave pública**, feita para
  ficar no navegador. Não há nenhuma chave secreta no site.
