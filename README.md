# CRAFTSTACK — Your Vision. Our Craftsmanship.

Official website of CRAFTSTACK: custom websites, apps, operating systems and other digital products. Contact: [nasoft.it@gmail.com](mailto:nasoft.it@gmail.com)

Static site — plain HTML, CSS and JavaScript (Three.js loads from a CDN). No build step, no sign-in, no secrets.

## Project structure
```
index.html   privacy.html   terms.html   netlify.toml
css/styles.css
js/main.js  inquiry.js  scene.js  config.js
assets/craftstack-logo.png  logo-mark.png  favicon.png
```

## Hidden files (create these in GitHub by hand)
GitHub's web uploader skips files starting with a dot, so they are not in the ZIP. Add them with **Add file → Create new file**:

| File name | Contents |
|---|---|
| `.nojekyll` | empty (type one blank line if GitHub won't accept an empty file) — only needed for GitHub Pages |
| `.gitignore` | `.DS_Store`<br>`Thumbs.db`<br>`node_modules/`<br>`.env`<br>`.env.*` |

## Deploy on GitHub Pages
Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save. The site appears at `https://<username>.github.io/<repo>/` (all paths are relative, so the sub-path works).

## Deploy on Netlify from GitHub
Netlify → Add new site → Import from Git → pick this repo → build command: *(empty)*, publish directory: *(empty / `.`)* → Deploy.

## Inquiry form (already wired to FormSubmit.co)
`js/config.js` → `inquiryEndpoint` posts to `https://formsubmit.co/ajax/nasoft.it@gmail.com`, which emails each inquiry to that address. **One-time activation:** the very first submission makes FormSubmit send an activation email to nasoft.it@gmail.com — open it (check spam) and click the confirm link; after that every inquiry arrives by email. If sending ever fails, the form shows an error and an email link instead of pretending it worked.

## Local preview
`python3 -m http.server 8000` then open http://localhost:8000 (ES modules don't load from `file://`).
