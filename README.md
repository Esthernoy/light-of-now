# Light of Now — site da loja

Este é o site da Light of Now, pronto para ser publicado na internet no endereço
**https://lightofnow.com.br**.

O site é o mesmo que foi aprovado: mesmas cores, fotos, textos, preços e a mesma
sacola. A única diferença é por dentro: as fotos, que antes vinham "coladas" dentro de
um arquivo só de 1,1 MB, agora são arquivos separados. A página ficou com 24 KB e
abre mais rápido, principalmente no celular. Quem volta ao site nem precisa baixar
as fotos de novo, porque o navegador guarda as fotos.

---

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `site/` | **o site em si.** É isto que vai para a internet |
| `site/index.html` | a página (textos, cards, preços que aparecem na tela) |
| `site/loja.js` | o funcionamento da loja: sacola, frete, Pix, **preços e estoque** |
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
sozinho, e na próxima etapa ela vai guardar o estoque e os pedidos.

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

### Jeito rápido (só para a Etapa 1): arrastar a pasta

Entre em https://app.netlify.com/drop e arraste a pasta **`site`** para a página.
Pronto. Esse jeito serve enquanto o site não tem estoque online — a partir da
Etapa 2 é preciso usar o GitHub.

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

## 3. Mudar preços, estoque e dados do Pix

Tudo fica no começo do arquivo **`site/loja.js`**, na parte
`CONFIGURAÇÕES`:

- **`PRECOS`** — preço de cada tamanho, usado na sacola e no Pix.
  Use ponto no lugar da vírgula: `39.50`.
  **Atenção:** o preço também está escrito nos quadros azuis da seção
  "Tamanhos e Valores", em `site/index.html` (procure por `R$&nbsp;49,90`,
  `39,50` etc.). **Mude nos dois lugares.**
- **`ESTOQUE`** — quantas velas de cada essência e tamanho. Quando chegar a 0,
  o tamanho aparece riscado. *(Na Etapa 2 o estoque sai daqui e passa a ser
  ajustado pelo /admin, com botões.)*
- **`PIX`** — chave, nome e cidade do recebedor.
- **`ENTREGA`** — faixas de preço por distância e o valor do frete grátis.

Depois de salvar, envie para o GitHub (ou arraste a pasta `site` de novo) e em
um minuto está no ar.

---

## 4. Se algo parar de funcionar

| O que aconteceu | O que fazer |
|---|---|
| O site não abre pelo domínio, mas abre pelo endereço `.netlify.app` | É o DNS. Confira o passo 2.2 no Registro.br. Se mudou há menos de 24 h, espere |
| Aparece aviso de "conexão não segura" | Netlify → Domain management → HTTPS → **Verify DNS configuration** e **Provision certificate** |
| Mudei algo e não apareceu | Na Netlify, veja em **Deploys** se a última publicação ficou verde. No celular, feche e abra a página de novo |
| O frete não calcula | O frete usa serviços gratuitos de CEP. Se todos estiverem fora do ar, o site mostra "a combinar" e a cliente segue a compra normalmente |
| O e-mail do pedido não chegou | O pedido também vai pelo WhatsApp. Confira a conta do EmailJS (limite do plano grátis) |
| O site inteiro saiu do ar | Na Netlify → **Deploys**, clique numa publicação antiga que funcionava → **Publish deploy**. Ela volta na hora |

---

## Para quem for mexer no código

- O site continua **estático** (HTML, CSS e JS, sem etapa de montagem).
- As imagens são os **mesmos bytes** do arquivo original (nada foi recomprimido);
  o nome leva um pedaço do hash do conteúdo, por isso o cache de 1 ano é seguro.
- `ferramentas/extrair.py` refaz a separação a partir de um arquivo único novo;
  `ferramentas/imagem_compartilhar.py` refaz a `compartilhar.jpg`.
- Testes (precisam do Chrome instalado e de um servidor local na porta 8765):

  ```bash
  python -m http.server 8765
  ```
  ```bash
  cd testes && npm install && node visual.js && node fluxo.js
  ```

  `visual.js` compara o original com o site separado, pixel a pixel, a 1440 px e
  a 390 px (página inteira, sacola etapa 1 e etapa 2). `fluxo.js` faz uma compra
  com retirada e outra com entrega, confere total e frete, valida o CRC do Pix,
  lê o QR Code e confere que a página mostra tudo sem JavaScript.
- A chave do EmailJS que aparece em `loja.js` é a **chave pública**, feita para
  ficar no navegador. Não há nenhuma chave secreta no site.
