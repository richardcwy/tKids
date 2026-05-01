// Server-side GA injector for raw-HTML routes that bypass Layout.astro
// (e.g. /tcoach, /design-system-demo). For Astro-template pages, use the
// <GoogleAnalytics /> component directly — this helper is only for routes
// that pass an entire <!DOCTYPE html> document through ?raw imports.
//
// Behavior matches GoogleAnalytics.astro:
//   - No-op when PUBLIC_GA_MEASUREMENT_ID is empty (clean dev, opt-out env)
//   - Respects Do Not Track inside the inline script
//   - anonymize_ip + send_page_view enabled

const GA_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID ?? "";

const SNIPPET = GA_ID
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
(function () {
  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === "1" || dnt === "yes") return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', '${GA_ID}', { anonymize_ip: true, send_page_view: true });
  window.gtag = gtag;
})();
</script>
`
  : "";

export function injectGA(html: string): string {
  if (!SNIPPET) return html;
  // Insert just before </head>. Case-insensitive match in case the source
  // HTML uses </HEAD> for some reason.
  return html.replace(/<\/head>/i, `${SNIPPET}</head>`);
}
