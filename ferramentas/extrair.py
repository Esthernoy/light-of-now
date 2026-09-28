"""
Separa o site de arquivo único (HTML com tudo embutido) em arquivos para publicar.

    python ferramentas/extrair.py ferramentas/original.html

O que faz:
  - tira cada imagem base64 do HTML e grava em site/img/ com os MESMOS bytes
    (nada é recomprimido: a qualidade é exatamente a do original);
  - o nome do arquivo leva um pedaço do "hash" do conteúdo (ex.: ocean-breeze.3f2a1c9d.webp),
    então, se a foto mudar, o nome muda e o navegador baixa a nova — por isso as imagens
    podem ficar em cache por um ano;
  - separa o CSS em site/estilo.css, a biblioteca do QR Code em site/qrcode.js
    e o código da loja em site/loja.js;
  - acrescenta no <head> o endereço oficial (canonical, og:url, og:image).

Só é preciso rodar de novo se chegar uma versão nova do arquivo único.
"""
import base64
import hashlib
import re
import sys
from pathlib import Path

DOMINIO = 'https://lightofnow.com.br'
RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'site'

DATA_URI = re.compile(r'data:image/(png|webp|avif|jpeg|gif);base64,([A-Za-z0-9+/=]{40,})')

# nome legível de cada imagem, decidido pelo texto que vem logo antes dela no HTML
NOMES = [
    (r'rel="icon"[^>]*href="$', 'favicon'),
    (r'--flor:url\($', 'flor'),
    (r'<source type="image/avif" srcset="$', 'olho'),
    (r'="><img src="$', 'olho'),   # o <img> que vem logo depois do <source> AVIF da capa
    (r'<img class="mk-olho" src="$', 'olho-marca'),
]
ALT_CARD = re.compile(r'alt="Vela aromática (.+?) da Light of Now"')


def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def nome_da_imagem(html, ini, fim):
    antes = html[max(0, ini - 300):ini]
    for padrao, nome in NOMES:
        if re.search(padrao, antes, re.S):
            return nome
    depois = html[fim:fim + 200]
    m = ALT_CARD.search(depois)
    if m:
        return slug(m.group(1))
    raise SystemExit(f'Imagem sem nome conhecido perto de: ...{antes[-80:]!r}')


def main(origem):
    html = Path(origem).read_text(encoding='utf-8')
    (SAIDA / 'img').mkdir(parents=True, exist_ok=True)

    trocas, relatorio = [], []
    for m in DATA_URI.finditer(html):
        ext = {'jpeg': 'jpg'}.get(m.group(1), m.group(1))
        dados = base64.b64decode(m.group(2))
        nome = nome_da_imagem(html, m.start(), m.end())
        h = hashlib.sha256(dados).hexdigest()[:8]
        arq = f'{nome}.{h}.{ext}'
        (SAIDA / 'img' / arq).write_bytes(dados)
        trocas.append((m.start(), m.end(), 'img/' + arq))
        relatorio.append((arq, len(m.group(0)), len(dados)))

    for ini, fim, novo in reversed(trocas):
        html = html[:ini] + novo + html[fim:]

    # CSS
    m = re.search(r'<style>\n(.*?)</style>', html, re.S)
    css = m.group(1)
    # o CSS vai morar na raiz do site, igual ao HTML: os caminhos img/... continuam valendo
    (SAIDA / 'estilo.css').write_text(css, encoding='utf-8', newline='\n')
    html = html[:m.start()] + '<link rel="stylesheet" href="estilo.css">' + html[m.end():]

    # JS: biblioteca do QR Code separada do código da loja
    m = re.search(r'<script>\n(/\* ═+ Light of Now — loja ═+ \*/.*?)</script>', html, re.S)
    js = m.group(1)
    q = re.search(r'^var qrcode=.*$\n', js, re.M)
    (SAIDA / 'qrcode.js').write_text(
        '/* qrcode-generator (Kazuhiko Arase, licença MIT) */\n' + q.group(0),
        encoding='utf-8', newline='\n')
    loja = js[:q.start()] + js[q.end():]
    (SAIDA / 'loja.js').write_text(loja, encoding='utf-8', newline='\n')
    html = (html[:m.start()]
            + '<script src="qrcode.js"></script>\n<script src="loja.js"></script>'
            + html[m.end():])

    # endereço oficial para buscadores e para a prévia no WhatsApp/Instagram
    # a imagem de compartilhamento é gerada por ferramentas/imagem_compartilhar.py
    og_img = DOMINIO + '/compartilhar.jpg'
    extra = (
        f'<link rel="canonical" href="{DOMINIO}/">\n'
        f'<meta property="og:url" content="{DOMINIO}/">\n'
        f'<meta property="og:image" content="{og_img}">\n'
        '<meta property="og:image:width" content="1200">\n'
        '<meta property="og:image:height" content="630">\n'
        '<meta property="og:image:alt" content="Light of Now — Velas Aromáticas Artesanais">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
    )
    html = html.replace('<meta property="og:locale" content="pt_BR">\n',
                        '<meta property="og:locale" content="pt_BR">\n' + extra, 1)

    (SAIDA / 'index.html').write_text(html, encoding='utf-8', newline='\n')

    print(f'{"arquivo":40} {"base64":>10} {"bytes":>10}')
    for arq, b64, n in relatorio:
        print(f'{arq:40} {b64:>10,} {n:>10,}')
    print(f'\nindex.html: {len(html.encode()):,} bytes '
          f'(antes {Path(origem).stat().st_size:,})')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else RAIZ / 'ferramentas' / 'original.html')
