# Surya Narayanan K S — portfolio

Source for <https://sn1502.github.io/surya-portfolio/>. A single static page: no build step, no dependencies, no third-party requests.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | All the content. Edit text here. |
| `assets/site.css` | Styles. Colours and type sizes are variables at the top of the file. |
| `assets/site.js` | The service board animation in the header and the "Copy address" button. The page works without it. |
| `assets/fonts/` | Bricolage Grotesque (variable, Latin subset), self-hosted under the SIL Open Font License (`OFL.txt`). |
| `assets/favicon.svg`, `assets/og.png` | Browser tab icon and the image shown when the link is shared. |
| `404.html` | Shown by GitHub Pages for any address that doesn't exist. |

## Preview locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish

GitHub Pages serves the `main` branch from the repository root (Settings → Pages → Deploy from a branch → `main` / root). Anything merged to `main` is live within a minute or two.

## Common edits

- **Add a project:** copy one `<article class="project">` block in `index.html` and change the text and link.
- **Add a job:** copy one `<article class="role">` block.
- **Change the address of the site:** update the `canonical` link, the `og:url` and `og:image` tags and the JSON-LD `url` in the `<head>` of `index.html`, plus the link in `404.html`.
