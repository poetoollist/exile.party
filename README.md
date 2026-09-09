<p align="center">
  <img src=".github/og.png" alt="exile.party" width="640">
</p>

<h1 align="center">exile.party</h1>

<p align="center">
  A curated directory of third-party tools for Path of Exile 1 and 2.<br>
  <a href="https://exile.party">exile.party</a>
</p>

---

Every listing says what platform a tool runs on, what it costs, whether the source is open, and
when someone last checked the entry. Each tool keeps its metadata and images in one directory.

## Add a tool

The catalogue lives in [`tools/`](tools). Adding a tool is one pull request with a new directory.

1. Fork this repository, or use
   [the new-file link](https://github.com/poetoollist/exile.party/new/main/tools?filename=your-tool%2Fabout.yaml)
   and GitHub will fork it for you.
2. From a local checkout, run the interactive scaffolder. It asks required fields first, then
   optional and conditional fields, and derives the kebab-case directory id from the name:

   ```bash
   bun run new-tool
   ```

   Alternatively, create `tools/your-tool/about.yaml` by hand:

   ```yaml
   name: Your Tool
   description: One factual sentence, 10 to 300 characters.
   url: https://example.com
   games: [poe1, poe2]
   category: overlays-and-companions
   tags: [overlay, price-check]
   platforms: [windows, linux]
   pricing: free
   openSource: true
   source: https://github.com/you/your-tool
   status: active
   lastVerified: 2026-09-05
   ```

3. Optionally add `tools/your-tool/icon.png` (also `.svg` or `.webp`). Put screenshots in
   `tools/your-tool/shots/` and list their filenames under `screenshots:` in display order.
4. Run `bun run validate`. It checks every entry and asset, and prints the offending path if
   anything is wrong.
5. Open a pull request.

### Fields

| Field          | Required | Notes                                                                                               |
|----------------|----------|-----------------------------------------------------------------------------------------------------|
| directory name | yes      | the tool id; kebab-case and unique                                                                  |
| `name`         | yes      | as the tool calls itself                                                                            |
| `description`  | yes      | 10 to 300 characters, plain and factual                                                             |
| `url`          | yes      | primary https link; use the repository when there is no separate website                            |
| `urls`         | no       | `{ poe1, poe2 }` when the games have separate primary links                                         |
| `games`        | yes      | any of `poe1`, `poe2`                                                                               |
| `category`     | yes      | one of the ids in `tools/categories.yaml`                                                           |
| `alsoIn`       | no       | more ids from `tools/categories.yaml` the tool is also listed under; must not repeat `category`     |
| `tags`         | no       | kebab-case, used by search                                                                          |
| `platforms`    | yes      | `windows`, `macos`, `linux`, `web`, `android`, `ios`                                                |
| `pricing`      | yes      | `free`, `freemium`, `paid`                                                                          |
| `openSource`   | yes      | stated outright, so a missing repo link never reads as proprietary                                  |
| `source`       | no       | repository URL when different from `url`; only valid when `openSource` is true                      |
| `sources`      | no       | `{ poe1, poe2 }` for projects with a repository per game                                            |
| `official`     | no       | published by Grinding Gear Games rather than the community                                          |
| `editorsPick`  | no       | what we would hand a new player first                                                               |
| `newPlayer`    | no       | listed in the Start here section for new players; independent of editorsPick                        |
| `rank`         | no       | map of section id to position; ranked tools lead that section, then A to Z                          |
| `byMaintainer` | no       | written by a maintainer of this site; the card discloses it                                         |
| `author`       | no       | who makes the tool; otherwise the GitHub owner of `source` or `url` is shown                        |
| `headline`     | no       | one sentence for the tool page, 10 to 120 characters; otherwise the first sentence of `description` |
| `screenshots`  | no       | list of file names under the tool's `shots/` directory, shown in that order                          |
| `status`       | yes      | `active`, `unmaintained`, `dead`                                                                    |
| `lastVerified` | yes      | `YYYY-MM-DD`; entries older than six months are flagged as stale                                    |
| `notes`        | no       | one caveat worth knowing, up to 300 characters                                                      |

Listings are checked before merge. A tool does not have to be open source to be listed.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

| Command             | Does                                                       |
| ------------------- | ---------------------------------------------------------- |
| `bun run dev`       | dev server                                                   |
| `bun run new-tool`  | interactively scaffolds `tools/<id>/about.yaml`              |
| `bun run build`     | generates OG images, then builds the static site to `build`   |
| `bun run preview`   | serves the built site                                        |
| `bun run validate`  | checks tool metadata and collocated assets                   |
| `bun run og`        | regenerates the OG images and the banner above               |
| `bun run lint`      | prettier and eslint                                          |
| `bun run check`     | svelte-check                                                 |
| `bun run test`      | unit tests                                                   |
| `bun run test:e2e`  | Playwright tests                                             |

Built with SvelteKit and Tailwind, prerendered to static files by `adapter-static`. Metadata is
loaded from `tools/*/about.yaml` and validated with Zod at build time, so a malformed entry fails
the build rather than the page. Vite bundles each directory's icon and screenshots as static
assets. Open Graph cards are rendered by [Takumi](https://takumi.kane.tw) into `static/og`, which
is gitignored and regenerated on every build.

## Licence

[MIT](LICENSE). Listings describe tools made by other people; each remains the property of its
author.

This site is not affiliated with or endorsed by Grinding Gear Games. Path of Exile is a trademark of
Grinding Gear Games.
