import { NextResponse } from 'next/server';

import {
  ApiSite,
  getAvailableApiSites,
  getCacheTime,
  getConfig,
} from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'edge';

// 单个源的最长等待时间。慢源不应拖死整次搜索。
const SOURCE_TIMEOUT_MS = 20000;

// 给单个源的搜索加超时。无论成功还是超时都要清掉定时器，
// 否则已经返回的请求会留下挂起的 20 秒定时器，拖住 worker 回收。
async function searchWithTimeout(
  site: ApiSite,
  query: string
): Promise<SearchResult[]> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      searchFromApi(site, query),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`${site.name} timeout`)),
          SOURCE_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites();

  // 每个源单独兜底：超时或报错都降级成空结果，不影响其他源。
  // 之前用 Promise.all，任何一个源抛错就会让整次搜索返回 500。
  const searchPromises = apiSites.map((site) =>
    searchWithTimeout(site, query).catch(() => [])
  );

  try {
    const results = await Promise.all(searchPromises);
    let flattenedResults = results.flat();
    if (!config.SiteConfig.DisableYellowFilter) {
      flattenedResults = flattenedResults.filter((result) => {
        const typeName = result.type_name || '';
        return !yellowWords.some((word: string) => typeName.includes(word));
      });
    }

    // 空结果不写 CDN 缓存，否则“没搜到”会被缓存住一段时间。
    if (flattenedResults.length === 0) {
      return NextResponse.json(
        { results: [] },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cacheTime = await getCacheTime();

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
