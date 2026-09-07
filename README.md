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
when someone last checked the entry. The whole catalogue is one YAML file.

## Add a tool

The catalogue lives in [`tools.yaml`](tools.yaml). Adding a tool is one pull request against it.

1. Fork this repository, or use
   [the edit link](https://github.com/poetoollist/exile.party/edit/main/tools.yaml) and GitHub will
   fork it for you.
2. Add an entry under `tools:`:

   ```yaml
   - id: your-tool
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

3. Run `bun run validate`. It checks the entry against the schema and prints the offending field if
   anything is wrong.
4. Open a pull request.

### Fields

| Field          | Required | Notes                                                                                               |
|----------------|----------|-----------------------------------------------------------------------------------------------------|
| `id`           | yes      | kebab-case, unique                                                                                  |
| `name`         | yes      | as the tool calls itself                                                                            |
| `description`  | yes      | 10 to 300 characters, plain and factual                                                             |
| `url`          | yes      | https only                                                                                          |
| `urls`         | no       | `{ poe1, poe2 }` when the games have separate pages                                                 |
| `games`        | yes      | any of `poe1`, `poe2`                                                                               |
| `category`     | yes      | one of the ids under `categories:` in the same file                                                 |
| `tags`         | no       | kebab-case, used by search                                                                          |
| `platforms`    | yes      | `windows`, `macos`, `linux`, `web`, `android`, `ios`                                                |
| `pricing`      | yes      | `free`, `freemium`, `paid`                                                                          |
| `openSource`   | yes      | stated outright, so a missing repo link never reads as proprietary                                  |
| `source`       | no       | repository URL; only valid when `openSource` is true                                                |
| `sources`      | no       | `{ poe1, poe2 }` for projects with a repository per game                                            |
| `official`     | no       | published by Grinding Gear Games rather than the community                                          |
| `editorsPick`  | no       | what we would hand a new player first                                                               |
| `byMaintainer` | no       | written by a maintainer of this site; the card discloses it                                         |
| `author`       | no       | who makes the tool; otherwise the GitHub owner of `source` or `url` is shown                        |
| `headline`     | no       | one sentence for the tool page, 10 to 120 characters; otherwise the first sentence of `description` |
| `icon`         | no       | file name under `static/icons/`, `svg`, `png` or `webp`; otherwise a monogram                       |
| `screenshots`  | no       | list of `{ file, caption }`; files live under `static/shots/<id>/`                                  |
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
| `bun run dev`       | dev server                                                 |
| `bun run build`     | generates OG images, then builds the static site to `build` |
| `bun run preview`   | serves the built site                                      |
| `bun run validate`  | checks `tools.yaml` against the schema                     |
| `bun run og`        | regenerates the OG images and the banner above             |
| `bun run lint`      | prettier and eslint                                        |
| `bun run check`     | svelte-check                                               |
| `bun run test`      | unit tests                                                 |
| `bun run test:e2e`  | Playwright tests                                           |

Built with SvelteKit and Tailwind, prerendered to static files by `adapter-static`. The catalogue is
parsed and validated with Zod at build time, so a malformed entry fails the build rather than the
page. Open Graph cards are rendered by [Takumi](https://takumi.kane.tw) into `static/og`, which is
gitignored and regenerated on every build.

## Licence

[MIT](LICENSE). Listings describe tools made by other people; each remains the property of its
author.

This site is not affiliated with or endorsed by Grinding Gear Games. Path of Exile is a trademark of
Grinding Gear Games.
