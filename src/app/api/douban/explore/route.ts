import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { DoubanItem, DoubanResult } from '@/lib/types';

interface DoubanExploreApiResponse {
  data?: Array<{
    id: string;
    title: string;
    rate: string;
    cover: string;
    url: string;
  }>;
}

const TYPE_TAGS: Record<string, string> = {
  movie: '电影',
  tv: '电视剧',
  show: '综艺',
};

// 年代选项 -> year_range 参数
function toYearRange(era: string): string {
  if (!era || era === '全部') return '';
  if (/^\d{4}$/.test(era)) return `${era},${era}`;

  const map: Record<string, string> = {
    '10年代': '2010,2019',
    '00年代': '2000,2009',
    '90年代': '1990,1999',
    '80年代': '1980,1989',
    更早: '1900,1979',
  };
  return map[era] || '';
}

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || 'movie';
  const tab = searchParams.get('tab') || '';
  const genre = searchParams.get('genre') || '';
  const region = searchParams.get('region') || '';
  const era = searchParams.get('era') || '';
  const pageStart = parseInt(searchParams.get('start') || '0', 10);
  const pageLimit = parseInt(searchParams.get('limit') || '25', 10);

  if (!TYPE_TAGS[type]) {
    return NextResponse.json(
      { error: 'type 参数必须是 movie、tv 或 show' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(pageStart) || pageStart < 0) {
    return NextResponse.json({ error: 'start 不能小于 0' }, { status: 400 });
  }

  if (!Number.isFinite(pageLimit) || pageLimit < 1 || pageLimit > 100) {
    return NextResponse.json(
      { error: 'limit 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  // 分类 tab（仅电影）映射到豆瓣排序/标签
  let sort = 'T'; // 近期热度
  let tags = TYPE_TAGS[type];
  if (type === 'movie') {
    if (tab === '最新') {
      sort = 'S'; // 首播时间
    } else if (tab === '豆瓣高分') {
      sort = 'R';
      tags = '豆瓣高分';
    } else if (tab === '冷门佳片') {
      sort = 'U';
      tags = '冷门佳片';
    }
  }

  let target = `https://movie.douban.com/j/new_search_subjects?sort=${sort}&range=0,10&tags=${encodeURIComponent(
    tags
  )}&start=${pageStart}&limit=${pageLimit}`;

  if (genre && genre !== '全部') {
    target += `&genres=${encodeURIComponent(genre)}`;
  }
  if (region && region !== '全部') {
    target += `&countries=${encodeURIComponent(region)}`;
  }
  const yearRange = toYearRange(era);
  if (yearRange) {
    target += `&year_range=${encodeURIComponent(yearRange)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Referer: 'https://movie.douban.com/explore',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://movie.douban.com',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanExploreApiResponse = await response.json();

    const list: DoubanItem[] = (doubanData.data || []).map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.cover || '',
      rate: item.rate || '',
      year: '',
    }));

    const result: DoubanResult = {
      code: 200,
      message: '获取成功',
      list,
    };

    const cacheTime = await getCacheTime();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      { error: '获取豆瓣筛选数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
