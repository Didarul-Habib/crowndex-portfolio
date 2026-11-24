# CrownDEX Portfolio

Premium AI video creator portfolio.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lenis
- Lucide Icons
- Netlify

## Local development

```powershell
npm install
npm run dev
```

## Production build

```powershell
npm run build
npm run preview
```

## Portfolio content

All projects are stored in:

`src/data/works.json`

Each item supports:

- `id`
- `url`
- `title` (optional)
- `category`
- `featured`
- `thumbnail` (optional)

The build-time script `scripts/fetch-embeds.mjs` retrieves post
text and author information using X's official oEmbed endpoint.

X post embeds are loaded only when a visitor opens a project.

## Adding thumbnails

Place an image inside:

`public/assets/thumbs/`

Then use its public path in the work entry:

`/assets/thumbs/example.jpg`

## Deployment

The production build is generated in `dist/`.

Netlify deployment configuration is included in `netlify.toml`.

See `deploy.ps1` for the deployment helper.