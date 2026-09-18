// Marketing homepage: fully static, prerendered at build time so it's
// crawlable (unlike the app shell in `(app)/`, which is ssr:false / CSR-only
// — see the comment in `(app)/+layout.ts`).
export const prerender = true;
export const ssr = true;
