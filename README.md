# light8lee.github.io

Personal homepage and technical blog for `https://light8lee.github.io/`.

This repository is prepared as a GitHub Pages user site. The remote repository should be named `light8lee.github.io` before publishing to the root GitHub Pages URL.

## Local Build

This site uses Jekyll. On Windows, run the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\serve.ps1
```

Then open `http://127.0.0.1:4000/`.

Manual commands:

```powershell
bundle install
bundle exec jekyll serve
```

## Content

- Markdown posts live in `_posts/`.
- Static assets live in `assets/`.
- Imported SCPO image-series assets live in `assets/posts/scpo/`.
