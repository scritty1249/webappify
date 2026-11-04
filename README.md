# Webappify

Basic bundler that combines multiple files for a static single-page website into a standalone HTML file.

# Usage

Run the contents of `/app/src` as a web server, or open the bundled `/app/build/webappify.html` in any browser.
> The bundle of Webappify was made using Webappify.

Upload any number of `.css` and `.js` files, with a single `.html` index page.

Submit the files and download the bundle.

## Notes
- Comments are preserved
- Subject to JavaScript string size limits, as files are encoded as Base64 URLs. 

## Limitations
- Only static ESM is supported
- Only stylesheet imports from HTML are supported
- Dynamic code imports are unsupported
- Multi-level subdirectories are unsupported
- Re-exports and export aggregation are unsupported
- Default exports are unsupported (don't feel like implementing)
- Imported JavaScript modules are stored globally in `window.__BUNDLE_MODULE_MAP`. Make sure this name is not used by any code.
