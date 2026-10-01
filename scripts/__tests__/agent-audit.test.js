const { discover, findIssues, render } = require('../agent-audit');

describe('agent capability audit', () => {
  test('discovers API routes and lifecycle hooks from the manifest', () => {
    const components = discover();
    expect(
      components.some((item) => item.path === 'src/app/api/login/route.ts')
    ).toBe(true);
    expect(components.some((item) => item.kind === 'hook')).toBe(true);
  });

  test('reports missing registry kinds without inventing components', () => {
    const issues = findIssues([{ kind: 'tool', name: 'search', path: 'x' }]);
    expect(issues).toContain('P2 missing capability kind: plugin');
    expect(issues).toContain('P2 missing capability kind: mcp');
  });

  test('renders a stable human-readable report', () => {
    const report = render(
      [{ kind: 'tool', name: 'search', path: 'src/search.ts' }],
      []
    );
    expect(report).toContain('# Agent capability audit');
    expect(report).toContain('`search`');
  });
});
