# Wagner Barbosa · site pessoal

Código do [engwagner.com.br](https://engwagner.com.br) — trajetória, habilidades,
projetos e interesses de Wagner Barbosa, em português (`/`) e inglês (`/en/`).

- **Tema escuro por padrão**, com opção de claro (a escolha fica salva no navegador).
- **Malha de polígonos** animada no fundo (canvas 2D, sem bibliotecas).
- **Zona segura**: o lado profissional é público; o pessoal (contato direto,
  currículo, história) só abre depois de consentimento e verificação anti-robô,
  servido por um Cloudflare Worker à parte.

## Stack

- HTML, CSS e JavaScript puros. **Sem etapa de build** e sem dependências: o
  GitHub Pages serve os arquivos como estão (`.nojekyll`).
- Fontes do Google Fonts (Space Grotesk, Inter, JetBrains Mono); ícones Lucide
  (licença ISC) embutidos como SVG.
- Zona segura: [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
  no navegador + Cloudflare Worker (repositório privado, separado deste).

## Estrutura

```
index.html          página em português
en/index.html       página em inglês (mesma estrutura, caminhos com ../)
404.html            página de erro (caminhos absolutos)
css/tokens.css      cores e fontes dos dois temas
css/styles.css      todo o resto, mobile-first
js/strings.js       textos que o JS monta (PT/EN), pelo <html lang>
js/polygons.js      malha de polígonos do fundo
js/zone.js          zona segura: modal, Turnstile, conversa com o Worker
js/main.js          tema, menu, scrollspy, animações, anos calculados
images/             foto, favicons, imagens de compartilhamento (og-image*.png)
robots.txt, sitemap.xml, CNAME, .nojekyll
```

Fora do repositório (no `.gitignore`): `private/` (currículo em PDF e conteúdo
da zona segura, que vão para o Worker), `preview/` (prévia de design) e `.claude/`.

## Rodar localmente

```bash
python -m http.server 5510
```

Abra `http://localhost:5510/` e `http://localhost:5510/en/`.

Em `localhost`, a zona segura usa automaticamente o Worker local do
`wrangler dev` (porta 8787) e a chave de teste do Turnstile, que sempre passa.

## Acrescentar conteúdo

Cada item é um bloco de HTML marcado com comentário — copie, cole e preencha,
**nas duas páginas** (`index.html` e `en/index.html`):

| Conteúdo | Bloco | Onde |
| --- | --- | --- |
| Experiência ou formação | `<li class="tl-item">` (`data-tipo`: `experiencia`, `formacao` ou `inicio`) | `#trajetoria` |
| Logo da empresa | arquivo quadrado em `images/logos/` (até 96 px) e `<span class="tl-logo">` no item; sem logo, `tl-logo--icon` | dentro do item |
| Categoria de habilidades | `<article class="card ...">` com `<ul class="chips">` | `#habilidades` |
| Habilidade | `<li class="chip" data-nivel="diario\|solido\|conhecimento">` | dentro da categoria |
| Projeto | `<article class="card project ...">` | `#projetos` |
| Interesse ou hobby | `<article class="card interest ...">` | `#interesses` |

As grades se ajustam sozinhas ao número de cartões; nada precisa mudar no CSS
ou no JS. Cores dos cartões: `tone-crimson`, `tone-violet`, `tone-sky`,
`tone-fuchsia`, `tone-indigo`, `tone-teal`, `tone-orange`.

## Zona segura

- Nada restrito mora neste repositório (ele é público): o Worker devolve o
  conteúdo depois de validar o token do Turnstile no servidor.
- O contrato entre o site e o Worker está no topo de `js/zone.js`.
- Para ligar em produção, preencha no `<head>` das duas páginas:
  `<meta name="zone-endpoint">` (endereço do Worker) e
  `<meta name="zone-sitekey">` (chave pública do Turnstile). Vazias, o modal
  avisa que a zona ainda não está no ar.
- O conteúdo vindo do servidor é montado com `textContent`, nunca `innerHTML`.

## Publicar

A `main` é publicada pelo GitHub Pages a cada push. Trabalhe numa branch e
faça o merge só quando estiver pronto.
