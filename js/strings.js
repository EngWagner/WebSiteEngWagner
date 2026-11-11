/**
 * Textos montados pelo JavaScript (rótulos que mudam com o estado, avisos).
 * O texto da página em si está no HTML de cada idioma: /index.html e /en/index.html.
 * O idioma vem de <html lang>.
 */
(function () {
  'use strict';

  var STRINGS = {
    pt: {
      'theme.toLight': 'Ativar tema claro',
      'theme.toDark': 'Ativar tema escuro',
      'menu.open': 'Abrir menu',
      'menu.close': 'Fechar menu',
      'footer.public': 'Você está vendo a versão pública.',
      'footer.full': 'Zona segura ativa: você está vendo a versão completa.',
      'zone.btn.active': 'Zona segura ativa — ver registro',
      'zone.unlocked': 'Restrito · liberado',
      'zone.story': 'Minha história',
      'zone.contact': 'Contato direto',
      'zone.phone': 'Telefone',
      'zone.email': 'E-mail',
      'zone.location': 'Localização',
      'zone.call': 'Ligar',
      'zone.open': 'Abrir',
      'zone.write': 'Escrever',
      'zone.copy': 'Copiar e-mail',
      'zone.cv': 'Baixar CV',
      'zone.cvPdf': 'Currículo (PDF)',
      'zone.err.offline': 'A zona segura ainda não está no ar. Tente de novo mais tarde.',
      'zone.err.verify': 'A verificação anti-robô não passou. Tente de novo.',
      'zone.err.network': 'Não consegui falar com o servidor. Confira a conexão e tente de novo.',
      'zone.err.rate': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
      'zone.err.cv': 'Não consegui baixar o currículo agora.',
      'zone.err.widget': 'A verificação anti-robô não carregou. Recarregue a página ou desative bloqueadores para este site.',
      'toast.unlocked': 'Zona segura liberada por 30 minutos.',
      'toast.locked': 'Você saiu da zona segura.',
      'toast.expired': 'A sessão da zona segura expirou.',
      'toast.copied': 'E-mail copiado.',
      'record.when': 'Data e hora',
      'record.ip': 'IP (guardado cifrado)',
      'record.country': 'País',
      'record.browser': 'Navegador',
      'record.terms': 'Termo aceito',
      'record.expires': 'Sessão expira',
      'lvl.diario': '(uso diário)',
      'lvl.solido': '(experiência sólida)',
      'lvl.conhecimento': '(conhecimento)'
    },
    en: {
      'theme.toLight': 'Switch to light theme',
      'theme.toDark': 'Switch to dark theme',
      'menu.open': 'Open menu',
      'menu.close': 'Close menu',
      'footer.public': 'You are viewing the public version.',
      'footer.full': 'Secure zone active: you are viewing the full version.',
      'zone.btn.active': 'Secure zone active — view record',
      'zone.unlocked': 'Restricted · unlocked',
      'zone.story': 'My story',
      'zone.contact': 'Direct contact',
      'zone.phone': 'Phone',
      'zone.email': 'E-mail',
      'zone.location': 'Location',
      'zone.call': 'Call',
      'zone.open': 'Open',
      'zone.write': 'Write',
      'zone.copy': 'Copy e-mail',
      'zone.cv': 'Download résumé',
      'zone.cvPdf': 'Résumé (PDF)',
      'zone.err.offline': 'The secure zone is not live yet. Please try again later.',
      'zone.err.verify': 'The anti-bot check did not pass. Please try again.',
      'zone.err.network': 'Could not reach the server. Check your connection and try again.',
      'zone.err.rate': 'Too many attempts in a row. Wait a moment and try again.',
      'zone.err.cv': 'Could not download the résumé right now.',
      'zone.err.widget': 'The anti-bot check did not load. Reload the page or disable blockers for this site.',
      'toast.unlocked': 'Secure zone unlocked for 30 minutes.',
      'toast.locked': 'You left the secure zone.',
      'toast.expired': 'Your secure zone session expired.',
      'toast.copied': 'E-mail copied.',
      'record.when': 'Date & time',
      'record.ip': 'IP (stored encrypted)',
      'record.country': 'Country',
      'record.browser': 'Browser',
      'record.terms': 'Notice accepted',
      'record.expires': 'Session expires',
      'lvl.diario': '(daily use)',
      'lvl.solido': '(solid experience)',
      'lvl.conhecimento': '(working knowledge)'
    }
  };

  var lang = /^en\b/i.test(document.documentElement.lang) ? 'en' : 'pt';

  window.T = function (key) {
    var value = STRINGS[lang][key];
    return value != null ? value : (STRINGS.pt[key] != null ? STRINGS.pt[key] : key);
  };
  window.T.lang = lang;
})();
