#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function argument(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? resolve(root, fallback) : resolve(process.argv[index + 1]);
}

const cliRoot = argument('--cli', '../cli');
const sdkRoot = argument('--sdk', '../extension-sdk');

const findings = [];

/** Every markdown file the plugin ships. */
function markdownFiles(directory) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = [
  ...markdownFiles(join(root, 'skills')),
  ...markdownFiles(join(root, 'commands')),
  join(root, 'README.md'),
];

/** `tappify extension add widget` -> ["extension", "add"] : words before any flag or argument. */
function commandPath(invocation) {
  const words = invocation.trim().split(/\s+/).slice(1);
  const path = [];
  for (const word of words) {
    // Case-insensitive, so `tappify Extension add` is reported rather than skipped.
    if (!/^[A-Za-z][A-Za-z-]*$/.test(word)) break;
    path.push(word);
  }
  return path;
}

let helpTree = null;
try {
  helpTree = JSON.parse(readFileSync(join(cliRoot, 'dist/cli-help.json'), 'utf8'));
} catch {
  findings.push(
    `${relative(root, join(cliRoot, 'dist/cli-help.json'))}  not built — run \`pnpm build && pnpm build:cli-reference\` in the cli repo`,
  );
}

/** The shortest prefix of `path` the command tree does not know, or null when it knows it all. */
function unknownPrefix(path) {
  if (helpTree === null) return null;
  let level = helpTree.commands;
  for (const [index, word] of path.entries()) {
    const found = level.find(
      command => command.name === word || command.aliases?.includes(word),
    );
    if (found === undefined) return path.slice(0, index + 1).join(' ');
    // A leaf command's remaining words are positional arguments
    // (`extension set visibility public`, `extension add widget`), not commands.
    if (!Array.isArray(found.commands) || found.commands.length === 0) return null;
    level = found.commands;
  }
  return null;
}

const sdkSymbols = new Set();
function collectDeclarations(directory) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      collectDeclarations(full);
      continue;
    }
    if (!entry.endsWith('.d.ts') && !entry.endsWith('.d.mts')) continue;
    const text = readFileSync(full, 'utf8');
    for (const [, name] of text.matchAll(
      /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm,
    )) {
      sdkSymbols.add(name);
    }
    for (const [, names] of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of names.split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) sdkSymbols.add(name.replace(/^type\s+/, ''));
      }
    }
  }
}
collectDeclarations(join(sdkRoot, 'dist'));

if (sdkSymbols.size === 0) {
  findings.push(
    `${relative(root, join(sdkRoot, 'dist'))}  no declarations found — run \`pnpm build\` in the extension-sdk repo`,
  );
}

const SDK_SYMBOL = /^(?:useTap[A-Za-z0-9]*|Tap[A-Z][A-Za-z0-9]*|create(?:Tap|Tappify)[A-Za-z0-9]*|verifyTappifyToken|signTestToken|renderWithTap|createTestClient|defineManifest|exposeName|manifestSchema|validateManifest|formFields|sendEvent|signWebhook|tapMatchers)$/;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const name = relative(root, file);

  const seenCommands = new Set();
  const checkInvocation = invocation => {
    const path = commandPath(invocation);
    const key = path.join(' ');
    if (key === '' || seenCommands.has(key)) return;
    seenCommands.add(key);
    const unknown = unknownPrefix(path);
    if (unknown !== null) {
      findings.push(`${name}  no such command: tappify ${unknown}`);
    }
  };
  for (const [, invocation] of text.matchAll(/`(tappify [^`]+)`/g)) {
    checkInvocation(invocation);
  }
  for (const [invocation] of text.matchAll(/^\s*tappify [^\n]+$/gm)) {
    checkInvocation(invocation);
  }

  const seenSymbols = new Set();
  for (const [, token] of text.matchAll(/`([A-Za-z_$][\w$]*)`/g)) {
    if (!SDK_SYMBOL.test(token) || seenSymbols.has(token)) continue;
    seenSymbols.add(token);
    if (sdkSymbols.size > 0 && !sdkSymbols.has(token)) {
      findings.push(`${name}  no such SDK export: ${token}`);
    }
  }
}

const SCOPE_KEY = /^[a-z][a-z0-9_]*:[a-z_]+$/;

function backticked(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)].map(([, token]) => token);
}

/** The file's `## ` sections, by heading. */
function sections(text) {
  const out = new Map();
  let heading = '';
  let lines = [];
  for (const line of text.split('\n')) {
    const next = /^##\s+(.*)$/.exec(line);
    if (next === null) {
      lines.push(line);
      continue;
    }
    out.set(heading, lines.join('\n'));
    heading = next[1];
    lines = [];
  }
  out.set(heading, lines.join('\n'));
  return out;
}

/** Every registry token `reference.md` restates, which `constants.ts` owns. */
function registryTokens(text, pageKeys) {
  const tokens = new Set();
  for (const token of backticked(text)) {
    if (SCOPE_KEY.test(token)) tokens.add(token);
  }

  const bySection = sections(text);
  const cells = heading =>
    (bySection.get(heading) ?? '')
      .split('\n')
      .filter(line => line.startsWith('|'))
      .map(line => line.split('|').slice(1, -1));

  for (const row of cells('Scopes')) {
    for (const token of backticked(row[0] ?? '')) tokens.add(token);
  }
  // Page key, then the slot and chart columns.
  for (const row of cells('Pages, slots and charts')) {
    for (const column of [0, 2, 3]) {
      for (const token of backticked(row[column] ?? '')) tokens.add(token);
    }
  }
  // A host table id is a host page key and a table name; `tap.context` beside
  // them in the same paragraph is a bridge member, not a registry token.
  for (const token of backticked(bySection.get('Host tables') ?? '')) {
    if (pageKeys.has(token.split('.')[0])) tokens.add(token);
  }
  for (const token of backticked(bySection.get('Contribution kinds') ?? '')) {
    if (!token.includes('.')) tokens.add(token);
  }
  for (const token of backticked(bySection.get('Categories') ?? '')) {
    tokens.add(token);
  }
  return tokens;
}

const referencePath = join(root, 'skills/building-tappify-extensions/reference.md');
const constantsPath = join(sdkRoot, 'src/manifest/constants.ts');
let referenceText = null;
try {
  referenceText = readFileSync(referencePath, 'utf8');
} catch {
  referenceText = null;
}

if (referenceText === null) {
  findings.push(
    `${relative(root, referencePath)}  missing — the registry reference is part of the skill`,
  );
} else {
  const name = relative(root, referencePath);
  let constants = null;
  try {
    constants = readFileSync(constantsPath, 'utf8');
  } catch {
    findings.push(
      `${name}  cannot read ${relative(root, constantsPath)} — pass --sdk <path> to the extension-sdk checkout`,
    );
  }

  if (constants !== null) {
    const pageKeys = new Set(
      [...constants.matchAll(/key: '([a-z][a-z0-9_]*)'/g)].map(([, key]) => key),
    );
    for (const token of registryTokens(referenceText, pageKeys)) {
      if (!constants.includes(`'${token}'`)) {
        findings.push(`${name}  ${token} is not in constants.ts`);
      }
    }

    const declared = backticked(referenceText);
    for (const [, key] of constants.matchAll(/key: '([a-z][a-z0-9_.]*:[a-z_]+)'/g)) {
      if (!declared.includes(key)) findings.push(`${name}  missing scope ${key}`);
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) process.stderr.write(`${finding}\n`);
  process.stderr.write(
    `\n${findings.length} finding${findings.length === 1 ? '' : 's'} in ${files.length} files\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `check-skills: ${files.length} files clean against ${sdkSymbols.size} SDK exports\n`,
);
