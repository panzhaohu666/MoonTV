/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'agent', 'manifest.json');
const reportPath = path.join(projectRoot, 'docs', 'AGENT_CAPABILITY_AUDIT.md');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') && entry.name !== '.husky') return [];
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function relative(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, '/');
}

function componentName(file, root) {
  const rel = path
    .relative(path.join(projectRoot, root.path), file)
    .replaceAll(path.sep, '/');
  return (
    rel
      .replace(/\.(tsx?|jsx?|mjs|cjs)$/, '')
      .replace(/\/route$/, '')
      .replace(/\/page$/, '') || root.path
  );
}

function discover() {
  return manifest.roots.flatMap((root) =>
    walk(path.join(projectRoot, root.path)).map((file) => ({
      kind: root.kind,
      name: componentName(file, root),
      path: relative(file),
      description: root.description,
    }))
  );
}

function findIssues(components) {
  const issues = [];
  const byName = new Map();
  for (const item of components) {
    const key = `${item.kind}:${item.name.toLowerCase()}`;
    const matches = byName.get(key) || [];
    matches.push(item.path);
    byName.set(key, matches);
  }
  for (const [key, files] of byName) {
    if (files.length > 1)
      issues.push(`P2 duplicate capability ${key}: ${files.join(', ')}`);
  }

  const requiredKinds = ['plugin', 'skill', 'mcp', 'hook', 'tool', 'resource'];
  for (const kind of requiredKinds) {
    if (!components.some((item) => item.kind === kind)) {
      issues.push(`P2 missing capability kind: ${kind}`);
    }
  }
  const proxy = components.find(
    (item) => item.path === 'src/app/api/image-proxy/route.ts'
  );
  const proxySource = proxy
    ? fs.readFileSync(path.join(projectRoot, proxy.path), 'utf8')
    : '';
  if (proxy && !proxySource.includes('isSafeImageUrl')) {
    issues.push('P1 external image proxy requires SSRF boundary validation');
  }
  return issues;
}

function render(components, issues) {
  const groups = ['plugin', 'skill', 'mcp', 'hook', 'tool', 'resource'];
  const lines = [
    '# Agent capability audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This report is generated from `agent/manifest.json`. It is inventory data, not execution proof.',
    '',
    '## Inventory',
  ];
  for (const kind of groups) {
    const items = components.filter((item) => item.kind === kind);
    lines.push('', `### ${kind} (${items.length})`);
    if (!items.length) lines.push('- none registered');
    for (const item of items.sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`- \`${item.name}\` — \`${item.path}\``);
    }
  }
  lines.push('', '## Findings', '');
  if (!issues.length) lines.push('- none');
  else issues.forEach((issue) => lines.push(`- ${issue}`));
  lines.push(
    '',
    '## Deliberate scope',
    '',
    '- No external plugins, MCP servers, credentials, or runtime code are installed by this audit.',
    '- Missing plugin/skill/MCP kinds are reported because this application currently has no local registry for them; adding empty shells would create no value.',
    ''
  );
  return `${lines.join('\n')}\n`;
}

function main() {
  const components = discover();
  const issues = findIssues(components);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, render(components, issues), 'utf8');
  console.log(
    `Audited ${components.length} components; found ${issues.length} findings.`
  );
  console.log(`Report: ${relative(reportPath)}`);
  if (issues.some((issue) => issue.startsWith('P0'))) process.exitCode = 2;
}

if (require.main === module) main();
module.exports = { discover, findIssues, render };
