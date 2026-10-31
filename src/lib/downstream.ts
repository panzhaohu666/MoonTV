import { API_CONFIG, ApiSite, getConfig } from '@/lib/config';
import { SearchResult } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

interface ApiSearchItem {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks?: string;
  vod_play_url?: string;
  vod_class?: string;
  vod_year?: string;
  vod_content?: string;
  vod_douban_id?: number;
  type_name?: string;
}

export async function searchFromApi(
  apiSite: ApiSite,
  query: string
): Promise<SearchResult[]> {
  try {
    const apiBaseUrl = apiSite.api;
    const apiUrl =
      apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
    const apiName = apiSite.name;

    // 添加超时处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let data: { list?: ApiSearchItem[]; pagecount?: number; page?: number };
    try {
      const response = await fetch(apiUrl, {
        headers: API_CONFIG.search.headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      // 读 body 也在超时保护内：clearTimeout 放到 finally，
      // 否则响应头先回、body 卡住时会一直挂着。
      data = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }

    if (
      !data ||
      !data.list ||
      !Array.isArray(data.list) ||
      data.list.length === 0
    ) {
      return [];
    }
    // 处理第一页结果
    const results = data.list
      .map((item: ApiSearchItem) => {
        let episodes: string[] = [];

        // 使用正则表达式从 vod_play_url 提取 m3u8 链接
        if (item.vod_play_url) {
          const m3u8Regex = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
          // 先用 $$$ 分割
          const vod_play_url_array = item.vod_play_url.split('$$$');
          // 对每个分片做匹配，取匹配到最多的作为结果
          vod_play_url_array.forEach((url: string) => {
            const matches = url.match(m3u8Regex) || [];
            if (matches.length > episodes.length) {
              episodes = matches;
            }
          });
        }

        episodes = Array.from(new Set(episodes)).map((link: string) => {
          link = link.substring(1); // 去掉开头的 $
          const parenIndex = link.indexOf('(');
          return parenIndex > 0 ? link.substring(0, parenIndex) : link;
        });

        return {
          id: item.vod_id.toString(),
          title: item.vod_name.trim().replace(/\s+/g, ' '),
          poster: item.vod_pic,
          episodes,
          source: apiSite.key,
          source_name: apiName,
          class: item.vod_class,
          year: item.vod_year
            ? item.vod_year.match(/\d{4}/)?.[0] || ''
            : 'unknown',
          desc: cleanHtmlTags(item.vod_content || ''),
          type_name: item.type_name,
          douban_id: item.vod_douban_id,
        };
      })
      // 解析不出播放地址的条目点了也放不了，理论上该丢弃。
      // 但配了 detail 的源（如 ffzy）播放地址在详情页 HTML 里，搜索结果本身
      // 就是 0 集（ffzy 的 /share/<hash> 不带 .m3u8 后缀，正则匹配不到），
      // 这类源必须保留，否则整个源会从搜索结果里消失。
      .filter((result: SearchResult) =>
        apiSite.detail ? true : result.episodes.length > 0
      );

    const config = await getConfig();
    const MAX_SEARCH_PAGES: number = config.SiteConfig.SearchDownstreamMaxPage;

    // 获取总页数
    const pageCount = data.pagecount || 1;
    // 确定需要获取的额外页数
    const pagesToFetch = Math.min(pageCount - 1, MAX_SEARCH_PAGES - 1);

    // 如果有额外页数，获取更多页的结果
    if (pagesToFetch > 0) {
      const additionalPagePromises = [];

      for (let page = 2; page <= pagesToFetch + 1; page++) {
        const pageUrl =
          apiBaseUrl +
          API_CONFIG.search.pagePath
            .replace('{query}', encodeURIComponent(query))
            .replace('{page}', page.toString());

        const pagePromise = (async () => {
          try {
            const pageController = new AbortController();
            const pageTimeoutId = setTimeout(
              () => pageController.abort(),
              8000
            );

            let pageData: { list?: ApiSearchItem[] } | undefined;
            try {
              const pageResponse = await fetch(pageUrl, {
                headers: API_CONFIG.search.headers,
                signal: pageController.signal,
              });

              if (!pageResponse.ok) return [];

              // 读 body 也在超时保护内
              pageData = await pageResponse.json();
            } finally {
              clearTimeout(pageTimeoutId);
            }

            if (!pageData || !pageData.list || !Array.isArray(pageData.list))
              return [];

            return (
              pageData.list
                .map((item: ApiSearchItem) => {
                  let episodes: string[] = [];

                  // 使用正则表达式从 vod_play_url 提取 m3u8 链接
                  if (item.vod_play_url) {
                    const m3u8Regex = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
                    // 先用 $$$ 分割（多线路），再取匹配最多的那条线路。
                    // 不拆分时正则的 [^"'\s] 会把 "#第02集$https://..." 整串吞成一条，产出无法播放的地址。
                    const vod_play_url_array = item.vod_play_url.split('$$$');
                    vod_play_url_array.forEach((url: string) => {
                      const matches = url.match(m3u8Regex) || [];
                      if (matches.length > episodes.length) {
                        episodes = matches;
                      }
                    });
                  }

                  episodes = Array.from(new Set(episodes)).map(
                    (link: string) => {
                      link = link.substring(1); // 去掉开头的 $
                      const parenIndex = link.indexOf('(');
                      return parenIndex > 0
                        ? link.substring(0, parenIndex)
                        : link;
                    }
                  );

                  return {
                    id: item.vod_id.toString(),
                    title: item.vod_name.trim().replace(/\s+/g, ' '),
                    poster: item.vod_pic,
                    episodes,
                    source: apiSite.key,
                    source_name: apiName,
                    class: item.vod_class,
                    year: item.vod_year
                      ? item.vod_year.match(/\d{4}/)?.[0] || ''
                      : 'unknown',
                    desc: cleanHtmlTags(item.vod_content || ''),
                    type_name: item.type_name,
                    douban_id: item.vod_douban_id,
                  };
                })
                // 与第一页保持一致：配了 detail 的源不按集数过滤
                .filter((result: SearchResult) =>
                  apiSite.detail ? true : result.episodes.length > 0
                )
            );
          } catch (error) {
            return [];
          }
        })();

        additionalPagePromises.push(pagePromise);
      }

      // 等待所有额外页的结果。用 allSettled，单页失败不该把第一页已拿到的结果一起丢掉。
      const additionalResults = await Promise.allSettled(
        additionalPagePromises
      );

      // 合并所有页的结果
      additionalResults.forEach((settled) => {
        if (settled.status === 'fulfilled' && settled.value.length > 0) {
          results.push(...settled.value);
        }
      });
    }

    return results;
  } catch (error) {
    return [];
  }
}

// 匹配 m3u8 链接的正则
const M3U8_PATTERN = /(https?:\/\/[^"'\s]+?\.m3u8)/g;

export async function getDetailFromApi(
  apiSite: ApiSite,
  id: string
): Promise<SearchResult> {
  if (apiSite.detail) {
    return handleSpecialSourceDetail(id, apiSite);
  }

  const detailUrl = `${apiSite.api}${API_CONFIG.detail.path}${id}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let detailData: { list?: ApiSearchItem[] };
  try {
    const response = await fetch(detailUrl, {
      headers: API_CONFIG.detail.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`详情请求失败: ${response.status}`);
    }

    // 读 body 也在超时保护内
    detailData = await response.json();
  } finally {
    clearTimeout(timeoutId);
  }

  const data = detailData;

  if (
    !data ||
    !data.list ||
    !Array.isArray(data.list) ||
    data.list.length === 0
  ) {
    throw new Error('获取到的详情内容无效');
  }

  const videoDetail = data.list[0];
  let episodes: string[] = [];

  // 处理播放源拆分
  if (videoDetail.vod_play_url) {
    const playSources = videoDetail.vod_play_url.split('$$$');
    if (playSources.length > 0) {
      const mainSource = playSources[0];
      const episodeList = mainSource.split('#');
      episodes = episodeList
        .map((ep: string) => {
          const parts = ep.split('$');
          return parts.length > 1 ? parts[1] : '';
        })
        .filter(
          (url: string) =>
            url && (url.startsWith('http://') || url.startsWith('https://'))
        );
    }
  }

  // 如果播放源为空，则尝试从内容中解析 m3u8
  if (episodes.length === 0 && videoDetail.vod_content) {
    const matches = videoDetail.vod_content.match(M3U8_PATTERN) || [];
    episodes = matches.map((link: string) => link.replace(/^\$/, ''));
  }

  return {
    id: id.toString(),
    title: videoDetail.vod_name,
    poster: videoDetail.vod_pic,
    episodes,
    source: apiSite.key,
    source_name: apiSite.name,
    class: videoDetail.vod_class,
    year: videoDetail.vod_year
      ? videoDetail.vod_year.match(/\d{4}/)?.[0] || ''
      : 'unknown',
    desc: cleanHtmlTags(videoDetail.vod_content || ''),
    type_name: videoDetail.type_name,
    douban_id: videoDetail.vod_douban_id,
  };
}

async function handleSpecialSourceDetail(
  id: string,
  apiSite: ApiSite
): Promise<SearchResult> {
  const detailUrl = `${apiSite.detail}/index.php/vod/detail/id/${id}.html`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(detailUrl, {
      headers: API_CONFIG.detail.headers,
      signal: controller.signal,
      // 保持跟随重定向：不少源会把 http 跳 https、或把详情页跳到规范地址，
      // 用 manual 会把这类正常源直接判死。
      // 部分源会把详情页 302 到 WAF 验证页（返回 200 + Verify Yourself），
      // 那种情况靠下面「解析不到 m3u8 就抛错」兜住，不需要在这里拦状态码。
    });

    if (!response.ok) {
      throw new Error(`详情页请求失败: ${response.status}`);
    }

    const html = await response.text();
    let matches: string[] = [];

    if (apiSite.key === 'ffzy') {
      const ffzyPattern =
        /\$(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g;
      matches = html.match(ffzyPattern) || [];
    }

    if (matches.length === 0) {
      const generalPattern = /\$(https?:\/\/[^"'\s]+?\.m3u8)/g;
      matches = html.match(generalPattern) || [];
    }

    // 去重并清理链接前缀
    matches = Array.from(new Set(matches)).map((link: string) => {
      link = link.substring(1); // 去掉开头的 $
      const parenIndex = link.indexOf('(');
      return parenIndex > 0 ? link.substring(0, parenIndex) : link;
    });

    // 提取标题：这类采集站的详情页普遍没有 <h1>，标题实际在 <title> 里
    // 形如「无辜者2016详情介绍-无辜者2016在线观看-... - 非凡资源网」
    // 或「佳妻如梦剧情介绍」。
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    let titleText = h1Match ? h1Match[1].trim() : '';
    if (!titleText) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
      if (titleTagMatch) {
        let raw = titleTagMatch[1].trim();
        // 去掉尾部「 - 站点名」。分隔符两侧必须都有空白才算站点名，
        // 否则「复仇者联盟5：毁灭之日-预告片」这类片名会被截成前半截。
        raw = raw.replace(/\s+[-_|]\s+.*$/, '');
        // 从第一个详情页后缀词处截断。不用通用分隔符切分，同样是为了保住片名里的连字符。
        const cut = raw.search(
          /(详情介绍|剧情介绍|在线观看|高清资源|免费在线观看|高清完整版)/
        );
        if (cut > 0) raw = raw.slice(0, cut);
        // 截断点紧贴分隔符时（如「Spider-Man-详情介绍」）会留下悬挂的 -/_，
        // 只剥尾部符号，不动片名中间的连字符。
        titleText = raw.replace(/[\s\-_|]+$/, '').trim();
      }
    }

    // 提取描述
    const descMatch = html.match(
      /<div[^>]*class=["']sketch["'][^>]*>([\s\S]*?)<\/div>/
    );
    const descText = descMatch ? cleanHtmlTags(descMatch[1]) : '';

    // 提取封面
    const coverMatch = html.match(/(https?:\/\/[^"'\s]+?\.jpg)/g);
    const coverUrl = coverMatch ? coverMatch[0].trim() : '';

    // 提取年份
    const yearMatch = html.match(/>(\d{4})</);
    const yearText = yearMatch ? yearMatch[1] : 'unknown';

    // 没解析出集数，说明拿到的不是真正的详情页（WAF 验证页、错误页等）。
    // 抛错让调用方降级，而不是返回一个 0 集的条目——那样点进去只会报「选集索引无效」。
    // 注意只以「有没有播放地址」为准：这类站点普遍没有 <h1>，拿标题做判据会误杀正常源。
    if (matches.length === 0) {
      throw new Error('详情页未解析到播放地址');
    }

    return {
      id,
      title: titleText,
      poster: coverUrl,
      episodes: matches,
      source: apiSite.key,
      source_name: apiSite.name,
      class: '',
      year: yearText,
      desc: descText,
      type_name: '',
      douban_id: 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
