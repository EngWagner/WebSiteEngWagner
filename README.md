# Wagner Barbosa | Portfólio Pessoal 🚀

Este é o repositório do site pessoal e profissional de **Wagner Barbosa** (disponível em [engwagner.com.br](https://engwagner.com.br)), desenvolvido com foco em alta performance, acessibilidade (a11y), SEO otimizado e estrutura moderna e limpa.

O projeto foi totalmente refatorado sob o paradigma **AI-First**, contendo documentação e diretrizes estruturadas para facilitar futuras extensões por desenvolvedores e agentes de inteligência artificial.

---

## 🛠️ Stack Tecnológica

O site foi construído utilizando tecnologias web puras (Vanilla) para máxima velocidade e controle:
* **HTML5 Semântico**: Estrutura organizada com tags nativas (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
* **CSS3 Customizado**: Estilização baseada em tokens de design próprios, sem frameworks de terceiros (como Bootstrap ou Tailwind).
* **JavaScript Nativo (Vanilla JS)**: Código de interação reescrito do zero, livre de dependências como jQuery.
* **GSAP (GreenSock Animation Platform) v3**: Responsável por todas as animações fluidas de abertura e transições entre seções.
* **Particles.js**: Efeito visual de fundo com partículas interativas no header do site.

---

## ⚡ Detalhes da Refatoração & Otimização

* **Remoção do jQuery**: A eliminação da biblioteca `jquery.min.js` reduziu o peso inicial da página em cerca de **83KB** e cortou requisições desnecessárias.
* **Carregamento Otimizado de Fontes**: Removidos os `@import` que bloqueavam a renderização de dentro dos arquivos CSS. Agora, as fontes são pré-conectadas (`preconnect`) e carregadas de forma assíncrona no `<head>` do HTML.
* **Resolução de Bugs Visuais**: Corrigida a inconsistência em que as barras de progresso de habilidades (como AWS) preenchiam larguras incorretas no CSS em relação ao texto exibido no HTML.
* **Melhoria de SEO**:
  * Inserção de uma tag `<h1>` principal para indexação do motor de busca.
  * Otimização de metadados (`meta description` e `meta keywords`), removendo termos padrão de templates.
  * Correção de erros de ortografia em português.
* **Segurança**: Inserção automática de `rel="noopener noreferrer"` em todos os links externos que abrem em nova aba (`target="_blank"`), evitando vulnerabilidades como *tabnabbing*.
* **Acessibilidade (a11y)**:
  * Elementos do menu hambúrguer e botão fechar foram alterados de `div` genéricas para `<button>` nativos com `aria-label` descritivo.
  * Adicionado suporte a leitores de tela e navegação por teclado.

---

## 🤖 Desenvolvimento AI-First (Como Estender o Site)

O repositório está equipado com um arquivo **[.cursorrules](.cursorrules)** na raiz. Esse arquivo contém todas as especificações técnicas, padrões de classes CSS (como as classes de barras de habilidade), e regras comportamentais de transição de seções em JS.

Ao trabalhar com assistentes de IA (como Gemini, Cursor, Copilot), o arquivo `.cursorrules` será lido automaticamente pela IA, garantindo que qualquer nova funcionalidade criada respeite as regras de design e a semântica do projeto.

---

## 💻 Como Rodar Localmente

Por se tratar de um site totalmente estático, nenhuma etapa de compilação ou build é necessária:
1. Clone o repositório em sua máquina.
2. Dê dois cliques em `index.html` para abrir diretamente no navegador ou utilize uma extensão de servidor local (como *Live Server* do VS Code).
