# Osgood Park

An [Astro](https://astro.build) site using [shadcn/ui](https://ui.shadcn.com) components, with access to the licensed [shadcnblocks.com](https://www.shadcnblocks.com) block registry.

## Tech stack

- **Astro 7** — static site framework
- **React 19** (`@astrojs/react`) — for shadcn/ui components, rendered as [islands](https://docs.astro.build/en/concepts/islands/)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **shadcn/ui** — components live in your codebase under `src/components/ui`
- **shadcnblocks.com** — licensed block registry, namespaced as `@shadcnblocks`

## Prerequisites

- [Node.js](https://nodejs.org) 22.12+
- [pnpm](https://pnpm.io) 11+

## Getting started

```sh
# install dependencies
pnpm install

# start the dev server (http://localhost:4321)
pnpm dev
```

> **Note:** On Astro 7, `pnpm dev` starts the dev server as a background daemon and returns immediately. Manage it with:
>
> ```sh
> pnpm astro dev status   # check if it's running
> pnpm astro dev logs     # tail logs
> pnpm astro dev stop     # stop it
> ```

## Environment variables

The `SHADCNBLOCKS_API_KEY` is **only needed to install blocks** from the licensed registry — it is not required to run or build the site.

```sh
cp .env.example .env.local
# then edit .env.local and set your key (starts with sk_live_)
```

Get the key from your [shadcnblocks.com dashboard](https://www.shadcnblocks.com) → API Keys. `.env.local` is git-ignored. The shadcn CLI reads it automatically.

## Adding components

**shadcn/ui** components:

```sh
pnpm dlx shadcn@latest add card input dialog
```

**shadcnblocks.com** blocks (requires `SHADCNBLOCKS_API_KEY`):

```sh
# browse the catalog
pnpm dlx shadcn@latest search @shadcnblocks

# preview before installing
pnpm dlx shadcn@latest add @shadcnblocks/hero1 --dry-run

# install
pnpm dlx shadcn@latest add @shadcnblocks/hero1
```

### Using a component on a page

shadcn components are React, so render them as islands in an `.astro` file. Add a [client directive](https://docs.astro.build/en/reference/directives-reference/#client-directives) (e.g. `client:load`) only if the component needs interactivity:

```astro
---
import "../styles/global.css";
import { Button } from "@/components/ui/button";
---
<Button size="lg">Get Started</Button>          <!-- static, no JS shipped -->
<Button client:load>Interactive</Button>        <!-- hydrated on load -->
```

## Commands

| Command                | Action                                              |
| :--------------------- | :-------------------------------------------------- |
| `pnpm install`         | Install dependencies                                |
| `pnpm dev`             | Start the dev server at `localhost:4321` (daemon)   |
| `pnpm astro dev stop`  | Stop the dev server                                 |
| `pnpm build`           | Build the production site to `./dist/`              |
| `pnpm preview`         | Preview the production build locally                |
| `pnpm astro ...`       | Run Astro CLI commands (`astro add`, `astro check`) |

## Project structure

```text
/
├── public/                 static assets
├── src/
│   ├── components/ui/       shadcn/ui components (button, ...)
│   ├── lib/utils.ts         cn() class-merge helper
│   ├── pages/index.astro    the homepage
│   └── styles/global.css    Tailwind + shadcn theme tokens
├── components.json          shadcn config + @shadcnblocks registry
└── astro.config.mjs         React + Tailwind integrations
```

## Notes

- The `@shadcnblocks` registry in `components.json` points at the canonical `https://www.shadcnblocks.com/r/{name}` host. The non-`www` host issues a cross-origin redirect, which strips the `Authorization` header (per the fetch spec) and breaks auth — so keep the `www.`.
