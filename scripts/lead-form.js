/* Lead capture for service pages: AJAX form (FormSubmit), Google Ads conversions,
   WhatsApp and e-mail click tracking. Messages follow <html lang>. */
(() => {
  'use strict';
  const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const T = EN ? {
    sending: 'Sending…',
    ok: 'Thank you. Sirius Dynamics will get back to you shortly.',
    fail: 'We could not send your message right now. Please write to <a href="mailto:eric@siriusdynamics.com.br">eric@siriusdynamics.com.br</a>.'
  } : {
    sending: 'Enviando…',
    ok: 'Recebemos sua mensagem. A Sirius Dynamics entrará em contato em breve.',
    fail: 'Não foi possível concluir o envio. Escreva diretamente para <a href="mailto:eric@siriusdynamics.com.br">eric@siriusdynamics.com.br</a>.'
  };
  const ADS_LEAD = 'AW-18114387726/wjAsCP3G2bYdEI6-zr1D';
  const ADS_WHATSAPP = 'AW-18114387726/bZceCLyF4LYdEI6-zr1D';
  const track = (name, params, sendTo) => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params);
    if (sendTo) window.gtag('event', 'conversion', { send_to: sendTo });
  };

  document.querySelectorAll('[data-lead-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.form-status');
      const label = button.innerHTML;
      button.disabled = true;
      button.textContent = T.sending;
      status.className = 'form-status';
      status.textContent = '';
      fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      })
        .then((r) => r.json().then((data) => { if (!r.ok || data.success === false) throw new Error(); return data; }))
        .then(() => {
          track('generate_lead', { form_name: form.dataset.leadForm, language: EN ? 'en' : 'pt' }, ADS_LEAD);
          form.reset();
          status.className = 'form-status form-success';
          status.textContent = T.ok;
        })
        .catch(() => { status.className = 'form-status form-error'; status.innerHTML = T.fail; })
        .finally(() => { button.disabled = false; button.innerHTML = label; });
    });
  });

  document.querySelectorAll('.whatsapp-float').forEach((link) => {
    link.addEventListener('click', () => track('whatsapp_click', { placement: 'floating_corner', page: location.pathname }, ADS_WHATSAPP));
  });
  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.addEventListener('click', () => track('email_click', { page: location.pathname }));
  });
})();
