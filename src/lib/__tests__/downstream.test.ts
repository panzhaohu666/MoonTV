import { ApiSite } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

const mockConfig = {
  SiteConfig: { SearchDownstreamMaxPage: 3 },
};

jest.mock('@/lib/config', () => ({
  API_CONFIG: {
    search: {
      path: '/api.php/provide/vod/?ac=list&wd=',
      pagePath: '/api.php/provide/vod/?ac=list&wd={query}&pg={page}',
      headers: {},
    },
    search2: { path: '', headers: {} },
    detail: { path: '', headers: {} },
  },
  getConfig: jest.fn(() => Promise.resolve(mockConfig)),
}));

const site: ApiSite = {
  key: 'test-source',
  name: '测试源',
  api: 'https://example.com',
} as ApiSite;

// 配了 detail 的源（如 ffzy）：播放地址在详情页 HTML 里，
// 搜索结果本身解析不出 m3u8 是正常的，不能被过滤掉。
const detailSite: ApiSite = {
  key: 'ffzy',
  name: '非凡影视',
  api: 'https://example.com',
  detail: 'https://example.com',
} as ApiSite;

function entry(id: number, playable: boolean) {
  return {
    vod_id: id,
    vod_name: `条目${id}`,
    vod_pic: `${id}.jpg`,
    vod_play_url: playable
      ? `第01集$https://cdn.example.com/${id}.m3u8`
      : `第01集$https://cdn.example.com/play/${id}-1-1`,
  };
}

describe('searchFromApi 结果过滤', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searchWithNoPlayableEpisode_dropsEntry - 解析不出播放地址的条目不应出现在结果里', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry(1, true),
          entry(2, false),
          { vod_id: 3, vod_name: '没有 vod_play_url', vod_pic: 'c.jpg' },
        ],
        pagecount: 1,
      }),
    }) as unknown as typeof fetch;

    const results = await searchFromApi(site, '测试');

    expect(results.map((r) => r.title)).toEqual(['条目1']);
  });

  it('searchPageTwoNoPlayableEpisode_dropsEntry - 分页结果同样要过滤 0 集条目', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const isFirstPage = !url.includes('pg=');
      return Promise.resolve({
        ok: true,
        json: async () =>
          isFirstPage
            ? { list: [entry(1, true)], pagecount: 2 }
            : { list: [entry(10, false), entry(11, true)], pagecount: 2 },
      });
    }) as unknown as typeof fetch;

    const results = await searchFromApi(site, '测试');
    const titles = results.map((r) => r.title);

    expect(titles).toContain('条目1');
    expect(titles).toContain('条目11');
    expect(titles).not.toContain('条目10');
  });

  it('searchSubsequentPageFails_keepsFirstPageResults - 分页抛错不该丢掉第一页结果', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const isFirstPage = !url.includes('pg=');
      if (isFirstPage) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ list: [entry(1, true)], pagecount: 3 }),
        });
      }
      return Promise.reject(new Error('分页请求炸了'));
    }) as unknown as typeof fetch;

    const results = await searchFromApi(site, '测试');

    expect(results.map((r) => r.title)).toEqual(['条目1']);
  });

  it('searchFromDetailSource_keepsEntryWithoutEpisodes - 配了 detail 的源解析不出 m3u8 也要保留', async () => {
    // 真实 ffzy 响应：分集地址是 /share/<hash>，不带 .m3u8 后缀
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          {
            vod_id: 100,
            vod_name: '非凡影片',
            vod_pic: 'x.jpg',
            vod_play_url:
              '第01集$https://vip.ffzy-play8.com/share/b9e4ce50f6c1ba80d31aa4826948a5a6#第02集$https://vip.ffzy-play8.com/share/9522d96aa350befc9a86085dcdfea632',
          },
        ],
        pagecount: 1,
      }),
    }) as unknown as typeof fetch;

    const results = await searchFromApi(detailSite, '测试');

    expect(results.map((r) => r.title)).toEqual(['非凡影片']);
  });

  it('searchWithoutDetailSource_dropsEntryWithoutEpisodes - 无 detail 的源仍然要丢弃 0 集条目', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          {
            vod_id: 200,
            vod_name: '无法播放',
            vod_pic: 'y.jpg',
            vod_play_url: '第01集$https://some.cdn.com/share/abcdef1234567890',
          },
        ],
        pagecount: 1,
      }),
    }) as unknown as typeof fetch;

    const results = await searchFromApi(site, '测试');

    expect(results).toEqual([]);
  });
});
