# Webbappify

Basic bundler that combines multiple files for a static single-page website into a standalone HTML file.

## Limitations
- Only static ESM is supported
- Dynamic code imports are unsupported
- Multi-level subdirectories are unsupported
- Re-exports and export aggregation are unsupported
- Default exports are unsupported (don't feel like implementing)
- Imported JavaScript modules are stored globally in `window.__BUNDLE_MODULE_MAP`. Make sure this name is not used by any code.