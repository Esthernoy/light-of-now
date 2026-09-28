"""
Gera site/compartilhar.jpg (1200x630), a imagem que aparece quando o link do site
é enviado no WhatsApp, Instagram ou Facebook. Usa só imagens que já estão no site:
o logo da capa e as quatro fotos das velas.

    python ferramentas/imagem_compartilhar.py
"""
from pathlib import Path
from PIL import Image

IMG = Path(__file__).resolve().parent.parent / 'site' / 'img'


def uma(prefixo):
    return Image.open(next(IMG.glob(prefixo + '.*.webp'))).convert('RGB')


tela = Image.new('RGB', (1200, 630), '#ffffff')

logo = uma('olho')
h = 540
logo = logo.resize((round(logo.width * h / logo.height), h), Image.LANCZOS)
tela.paste(logo, ((560 - logo.width) // 2 + 20, (630 - h) // 2))

lado, vao = 280, 14
x0, y0 = 1200 - (2 * lado + vao) - 40, (630 - (2 * lado + vao)) // 2
for i, nome in enumerate(['ocean-breeze', 'jardim-de-figo', 'lavandim-baunilha', 'aura-tropical']):
    foto = uma(nome).resize((lado, lado), Image.LANCZOS)
    tela.paste(foto, (x0 + (i % 2) * (lado + vao), y0 + (i // 2) * (lado + vao)))

destino = IMG.parent / 'compartilhar.jpg'
tela.save(destino, quality=88, optimize=True, progressive=True)
print(destino, destino.stat().st_size, 'bytes')
