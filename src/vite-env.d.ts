/// <reference types="vite/client" />

/*
 * `vite/client` already declares the asset module shapes this repo relies on:
 * `*?url` for the pdf.js worker taken as an asset URL (one copy of the runtime,
 * downloaded only on a cache miss) and `*.woff2` for a served font. Redeclaring
 * them here would only duplicate the reference that supplies them.
 */
