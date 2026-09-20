import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = resolve(dirname(fileURLToPath(import.meta.url)), 'check-skills.mjs');

const HELP_TREE = {
  name: 'tappify',
  commands: [
    { name: 'login', commands: [] },
    {
      name: 'extension',
      commands: [
        { name: 'add', commands: [] },
        { name: 'doctor', commands: [] },
        { name: 'set', commands: [] },
      ],
    },
  ],
};

const DECLARATIONS = [
  'export declare function renderWithTap(): void;',
  'export declare const TapCard: unknown;',
  'export declare function useTapProject(): void;',
  '',
].join('\n');

const CONSTANTS = [
  'export const SCOPES = [',
  "  { key: 'ui:render' },",
  "  { key: 'storage:write' },",
  '] as const;',
  "export const KINDS = ['page', 'widget'] as const;",
  '',
].join('\n');

const REFERENCE = [
  '# Registry and limits reference',
  '',
  '## Scopes',
  '',
  '| Key | Grants |',
  '| --- | --- |',
  '| `ui:render` | Render declared UI |',
  '| `storage:write` | Read and write storage |',
  '',
  '## Contribution kinds',
  '',
  '`page`, `widget`.',
  '',
].join('\n');

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/** A plugin checkout, a CLI checkout and an SDK checkout, all disposable. */
function fixture(files, { reference = REFERENCE, constants = CONSTANTS } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'check-skills-'));

  const plugin = join(base, 'plugin');
  mkdirSync(join(plugin, 'scripts'), { recursive: true });
  copyFileSync(checker, join(plugin, 'scripts/check-skills.mjs'));
  write(join(plugin, 'README.md'), '# The plugin\n');
  if (reference !== null) {
    write(join(plugin, 'skills/building-tappify-extensions/reference.md'), reference);
  }
  for (const [name, text] of Object.entries(files)) write(join(plugin, name), text);

  write(join(base, 'cli/dist/cli-help.json'), JSON.stringify(HELP_TREE));
  write(join(base, 'sdk/dist/index.d.ts'), DECLARATIONS);
  if (constants !== null) write(join(base, 'sdk/src/manifest/constants.ts'), constants);

  return { base, plugin };
}

function run(files, options) {
  const { base, plugin } = fixture(files, options);
  const result = spawnSync(
    process.execPath,
    [
      join(plugin, 'scripts/check-skills.mjs'),
      '--cli',
      join(base, 'cli'),
      '--sdk',
      join(base, 'sdk'),
    ],
    { encoding: 'utf8' },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    findings: result.stderr.split('\n').filter(line => line.includes('  ')),
  };
}

test('a leaf command’s trailing words are arguments, not commands', () => {
  const result = run({
    'skills/publishing-an-extension/SKILL.md': [
      'Set the listing with `tappify extension set visibility <value>`, where',
      '`<value>` is `private` or `public`.',
      '',
      '```bash',
      'tappify extension set visibility public',
      'tappify extension add widget',
      '```',
      '',
      'Then run `tappify extension doctor --fix`.',
      '',
    ].join('\n'),
  });

  assert.deepEqual(result.findings, []);
  assert.equal(result.status, 0);
});

test('quoted host copy with angle-bracket placeholders is not a command or a symbol', () => {
  const result = run({
    'skills/debugging-extension-load-failures/SKILL.md': [
      'The host shows "`<name>` could not be loaded from `<url>`" and names the',
      'module it looked for, `./widgets/<id>`.',
      '',
    ].join('\n'),
  });

  assert.deepEqual(result.findings, []);
  assert.equal(result.status, 0);
});

test('a symbol the SDK exports and a command the CLI registers both pass', () => {
  const result = run({
    'skills/building-tappify-extensions/SKILL.md':
      'Render with `TapCard`, read the project with `useTapProject`, and test with\n`renderWithTap`. Scaffold with `tappify extension add widget`.\n',
  });

  assert.deepEqual(result.findings, []);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /check-skills: \d+ files clean against 3 SDK exports/);
});

test('a command the CLI does not register and a symbol the SDK does not export both fail', () => {
  const result = run({
    'skills/adding-a-contribution/SKILL.md': 'Run `tappify extension frobnicate`.\n',
    'commands/new-extension.md': 'Call `useTapFrobnicate` from the widget.\n',
  });

  assert.deepEqual(result.findings, [
    'skills/adding-a-contribution/SKILL.md  no such command: tappify extension frobnicate',
    'commands/new-extension.md  no such SDK export: useTapFrobnicate',
  ]);
  assert.equal(result.status, 1);
});

test('a finding names the unknown word, not the arguments after it', () => {
  const result = run({
    'skills/adding-a-contribution/SKILL.md':
      'Run `tappify extension frobnicate widget --json` to scaffold it.\n',
  });

  assert.deepEqual(result.findings, [
    'skills/adding-a-contribution/SKILL.md  no such command: tappify extension frobnicate',
  ]);
  assert.equal(result.status, 1);
});

test('a miscased command is reported, not skipped', () => {
  const result = run({
    'skills/adding-a-contribution/SKILL.md': 'Run `tappify Extension add widget`.\n',
  });

  assert.deepEqual(result.findings, [
    'skills/adding-a-contribution/SKILL.md  no such command: tappify Extension',
  ]);
  assert.equal(result.status, 1);
});

test('the registry reference is cross-checked against the SDK constants', () => {
  const clean = run({});
  assert.deepEqual(clean.findings, []);
  assert.equal(clean.status, 0);

  const drifted = run(
    {},
    {
      reference: REFERENCE.replace('`widget`', '`gadget`').replace(
        '| `storage:write` | Read and write storage |\n',
        '',
      ),
    },
  );
  assert.deepEqual(drifted.findings, [
    'skills/building-tappify-extensions/reference.md  gadget is not in constants.ts',
    'skills/building-tappify-extensions/reference.md  missing scope storage:write',
  ]);
  assert.equal(drifted.status, 1);
});

test('a missing registry reference is a finding, not a silent skip', () => {
  const result = run({}, { reference: null });

  assert.deepEqual(result.findings, [
    'skills/building-tappify-extensions/reference.md  missing — the registry reference is part of the skill',
  ]);
  assert.equal(result.status, 1);
});

test('a missing constants.ts is a finding', () => {
  const result = run({}, { constants: null });

  assert.equal(result.findings.length, 1);
  assert.match(
    result.findings[0],
    /^skills\/building-tappify-extensions\/reference\.md {2}cannot read .*src\/manifest\/constants\.ts — pass --sdk <path> to the extension-sdk checkout$/,
  );
  assert.equal(result.status, 1);
});
