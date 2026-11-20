# Sirius Dynamics Technology

Site institucional estatico da Sirius Dynamics Technology.

## Estrutura

- `index.html` - pagina principal.
- `privacidade.html` - politica de privacidade.
- `termos-de-uso.html` - termos de uso.
- `assets/` - imagens usadas pelo site.
- `styles/` - CSS customizado.
- `vendor/` - dependencias locais do Webflow/GSAP/Lenis/jQuery/WebFont.

## Contato

eric@siriusdynamics.com.br

## Versão em inglês (/en/)

- `middleware.js` (Vercel) envia visitantes de fora de países lusófonos para a versão em inglês, com base no país do IP (`x-vercel-ip-country`). Robôs de busca e do Google Ads não são redirecionados. A escolha manual (botão PT/EN, `?lang=pt|en`) fica gravada no cookie `site_lang`.
- As páginas em `en/` são geradas, não editadas à mão. Depois de alterar uma página em português:
  1. `python i18n/extract.py` lista os textos novos sem tradução;
  2. adicione as traduções em `i18n/en.json` (textos de scripts e links em `i18n/en-extra.json`);
  3. `python i18n/build.py` regenera `en/`, o `sitemap.xml` (com hreflang) e os links alternativos de idioma.
- Mapa de URLs PT → EN: `i18n/routes.json`.
