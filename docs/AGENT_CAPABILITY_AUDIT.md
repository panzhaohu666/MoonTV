# Agent capability audit

Generated: 2026-10-01T15:48:52.177Z

This report is generated from `agent/manifest.json`. It is inventory data, not execution proof.

## Inventory

### plugin (0)
- none registered

### skill (0)
- none registered

### mcp (0)
- none registered

### hook (4)
- `_/husky.sh` — `.husky/_/husky.sh`
- `commit-msg` — `.husky/commit-msg`
- `post-merge` — `.husky/post-merge`
- `pre-commit` — `.husky/pre-commit`

### tool (45)
- `__tests__/agent-audit.test` — `scripts/__tests__/agent-audit.test.js`
- `agent-audit` — `scripts/agent-audit.js`
- `convert-config` — `scripts/convert-config.js`
- `generate-manifest` — `scripts/generate-manifest.js`
- `generate-version` — `scripts/generate-version.js`
- `admin/category` — `src/app/api/admin/category/route.ts`
- `admin/config` — `src/app/api/admin/config/route.ts`
- `admin/reset` — `src/app/api/admin/reset/route.ts`
- `admin/site` — `src/app/api/admin/site/route.ts`
- `admin/source` — `src/app/api/admin/source/route.ts`
- `admin/user` — `src/app/api/admin/user/route.ts`
- `change-password` — `src/app/api/change-password/route.ts`
- `cron` — `src/app/api/cron/route.ts`
- `detail` — `src/app/api/detail/route.ts`
- `douban/categories` — `src/app/api/douban/categories/route.ts`
- `douban/explore` — `src/app/api/douban/explore/route.ts`
- `douban` — `src/app/api/douban/route.ts`
- `favorites` — `src/app/api/favorites/route.ts`
- `image-proxy` — `src/app/api/image-proxy/route.ts`
- `login` — `src/app/api/login/route.ts`
- `logout` — `src/app/api/logout/route.ts`
- `playrecords` — `src/app/api/playrecords/route.ts`
- `register` — `src/app/api/register/route.ts`
- `search/one` — `src/app/api/search/one/route.ts`
- `search/resources` — `src/app/api/search/resources/route.ts`
- `search` — `src/app/api/search/route.ts`
- `searchhistory` — `src/app/api/searchhistory/route.ts`
- `server-config` — `src/app/api/server-config/route.ts`
- `skipconfigs` — `src/app/api/skipconfigs/route.ts`
- `admin.types` — `src/lib/admin.types.ts`
- `auth` — `src/lib/auth.ts`
- `config` — `src/lib/config.ts`
- `d1.db` — `src/lib/d1.db.ts`
- `db.client` — `src/lib/db.client.ts`
- `db` — `src/lib/db.ts`
- `douban.client` — `src/lib/douban.client.ts`
- `downstream` — `src/lib/downstream.ts`
- `fetchVideoDetail` — `src/lib/fetchVideoDetail.ts`
- `redis.db` — `src/lib/redis.db.ts`
- `runtime` — `src/lib/runtime.ts`
- `types` — `src/lib/types.ts`
- `upstash.db` — `src/lib/upstash.db.ts`
- `utils` — `src/lib/utils.ts`
- `version` — `src/lib/version.ts`
- `yellow` — `src/lib/yellow.ts`

### resource (19)
- `BackButton` — `src/components/BackButton.tsx`
- `CapsuleSwitch` — `src/components/CapsuleSwitch.tsx`
- `ContinueWatching` — `src/components/ContinueWatching.tsx`
- `DoubanCardSkeleton` — `src/components/DoubanCardSkeleton.tsx`
- `DoubanCustomSelector` — `src/components/DoubanCustomSelector.tsx`
- `DoubanSelector` — `src/components/DoubanSelector.tsx`
- `EpisodeSelector` — `src/components/EpisodeSelector.tsx`
- `GlobalErrorIndicator` — `src/components/GlobalErrorIndicator.tsx`
- `ImagePlaceholder` — `src/components/ImagePlaceholder.tsx`
- `MobileBottomNav` — `src/components/MobileBottomNav.tsx`
- `MobileHeader` — `src/components/MobileHeader.tsx`
- `PageLayout` — `src/components/PageLayout.tsx`
- `ScrollableRow` — `src/components/ScrollableRow.tsx`
- `Sidebar` — `src/components/Sidebar.tsx`
- `SiteProvider` — `src/components/SiteProvider.tsx`
- `ThemeProvider` — `src/components/ThemeProvider.tsx`
- `ThemeToggle` — `src/components/ThemeToggle.tsx`
- `UserMenu` — `src/components/UserMenu.tsx`
- `VideoCard` — `src/components/VideoCard.tsx`

## Findings

- P2 missing capability kind: plugin
- P2 missing capability kind: skill
- P2 missing capability kind: mcp

## Deliberate scope

- No external plugins, MCP servers, credentials, or runtime code are installed by this audit.
- Missing plugin/skill/MCP kinds are reported because this application currently has no local registry for them; adding empty shells would create no value.

