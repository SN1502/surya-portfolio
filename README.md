# Surya Narayanan K S — portfolio

Source for <https://sn1502.github.io/surya-portfolio/>. A single static page: no build step, no dependencies, no third-party requests.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | All the content. Edit text here. |
| `assets/site.css` | Styles. Colours and type sizes are variables at the top of the file. |
| `assets/site.js` | Everything interactive (see below). The page is complete without it: the interactive parts are hidden in the HTML and switched on by the script. |
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

## Interactive parts

- **Service board** (header): plays a start-up once, then each service can be stopped and started by pressing it, or all at once. Arrow keys move between services.
- **Explore**: pick a skill and the Work and Projects sections show only what used it. The choice is kept in the address, so `…/?skill=docker` can be shared as a link.
- **Try it here**: the Nila Alavai converter and the Deposit Manager maturity calculator run in the page, using the same unit sizes and interest rules as the apps.
- **Section bar**: appears once the header scrolls away and marks the section being read.
- **Theme switch**: light or dark, remembered on the device. Without a choice the page follows the system setting.

### Tagging for the skill filter

Each work bullet and each project carries a `data-skills` attribute, for example `data-skills="react android cicd"`. The names must match the `data-skill` value of a button in the Explore section. To add a skill, add a button there and tag the entries that use it.

## Common edits

- **Add a project:** copy one `<article class="project">` block in `index.html`, change the text and link, and set its `data-skills`.
- **Add a job:** copy one `<article class="role">` block.
- **Change the address of the site:** update the `canonical` link, the `og:url` and `og:image` tags and the JSON-LD `url` in the `<head>` of `index.html`, plus the link in `404.html`.
