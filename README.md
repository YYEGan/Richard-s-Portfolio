# Portfolio

This is a dependency-free static portfolio site powered by HTML, CSS, JavaScript and Three.js.

## Publish with GitHub Pages

1. Create an empty GitHub repository and push this project to its `main` branch.
2. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy-pages.yml` publishes only the public site files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `assets/`

The workflow deliberately excludes local files such as `key.json` and unrelated project notes.

## Update project covers

Add project cover images to `assets/` using the filenames referenced in `script.js`. Push the change to update the published site.
