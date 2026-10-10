# CRAFTSTACK site — setup & deployment

Static site (no build step, no login), published with GitHub Pages. To test locally use a web server (`python3 -m http.server 8000`); ES modules don't load from `file://`.

## Publish on GitHub Pages
1. Create a GitHub repository and upload all files in this folder to the `main` branch (keep the `.github` folder and `.nojekyll`).
2. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). The site goes live at `https://<username>.github.io/<repo>/`; the deployment URL also shows in the workflow run.
4. Custom domain (optional): **Settings → Pages → Custom domain**, then add the DNS records GitHub shows.

All paths are relative, so the site works both at `<username>.github.io/<repo>/` and on a custom domain.

## Inquiry form
Inquiries are emailed to `contactEmail` through FormSubmit (`inquiryEndpoint` in `js/config.js`), so no account or server is needed. **One-time step:** after publishing, send a test inquiry; FormSubmit emails an activation link to `contactEmail`. Click it once and every later inquiry arrives in that inbox. If sending ever fails, the form shows a mailto fallback. To use another service (e.g. Formspree), just replace `inquiryEndpoint`.

## Files
`index.html`, `css/styles.css`, `js/{main,inquiry,scene,config}.js`, `assets/`, `privacy.html`, `terms.html`, `.nojekyll`, `.github/workflows/pages.yml`.

Note: GitHub Pages can't set custom HTTP security headers (the old `netlify.toml` did this). That's fine for a static, login-free site.
