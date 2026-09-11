const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const visited = new Set();
const packages = new Map();
const missing = [];
function resolvePackage(from, name) {
  for (let directory = from; ; directory = path.dirname(directory)) {
    const candidate = path.join(directory, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return fs.realpathSync(candidate);
    if (directory === path.dirname(directory)) return null;
  }
}
function collect(directory) {
  if (visited.has(directory)) return;
  visited.add(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (directory !== root) {
    const notices = fs.readdirSync(directory).filter(name => /^(licen[sc]e|copying|notice)([.-]|$)/i.test(name))
      .sort().filter(name => fs.statSync(path.join(directory, name)).isFile())
      .map(name => `${name}\n${fs.readFileSync(path.join(directory, name), 'utf8')}`);
    // 少数包将许可正文放在 README 中。
    if (!notices.length) {
      const readme = fs.readdirSync(directory).find(name => /^readme\.md$/i.test(name));
      if (readme) {
        const text = fs.readFileSync(path.join(directory, readme), 'utf8');
        const match = text.match(/^#{1,4}\s+Licen[sc]e\b[^\n]*\n([\s\S]*)/im);
        if (match) notices.push(match[0]);
      }
    }
    const supplement = path.join(__dirname, 'license-notices', `${manifest.name.replaceAll('/', '__')}@${manifest.version}.txt`);
    if (fs.existsSync(supplement)) notices.push(fs.readFileSync(supplement, 'utf8'));
    if (!notices.length) missing.push({ name: manifest.name, version: manifest.version, repository: manifest.repository, license: manifest.license });
    packages.set(`${manifest.name}@${manifest.version}`, [
      `${manifest.name}@${manifest.version}`, `License: ${manifest.license || JSON.stringify(manifest.licenses || [])}`,
      `Author: ${typeof manifest.author === 'string' ? manifest.author : manifest.author?.name || ''}`,
      `Source: ${typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url || manifest.homepage || ''}`,
      ...notices,
    ].join('\n\n'));
  }
  const names = new Set(Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies }));
  for (const name of names) {
    const resolved = resolvePackage(directory, name);
    if (resolved) collect(resolved);
    else if (!manifest.optionalDependencies?.[name]) throw new Error(`Missing dependency: ${name}`);
  }
}
collect(root);
const header = 'Third-party software notices\n\nGenerated from the installed production dependency tree. Some packages or portions\nmay be removed by the frontend bundler. These notices preserve their original terms.\nElectron and Chromium ship separate license files in the application directory.\n';
const output = `${header}\n${[...packages].sort(([a], [b]) => a.localeCompare(b)).map(([, text]) => text).join('\n\n' + '='.repeat(72) + '\n\n')}`;
// 统一上游文本的换行和行尾空白，不改动许可内容。
fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.txt'), output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n');
console.log(`Generated notices for ${packages.size} production packages`);
if (missing.length) { console.error(JSON.stringify({ missing }, null, 2)); process.exitCode = 1; }
