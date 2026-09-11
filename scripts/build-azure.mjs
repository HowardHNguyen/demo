import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';

const governance = spawnSync(process.execPath, ['scripts/governance-identities.mjs'], { stdio: 'inherit' });
if (governance.status !== 0) process.exit(governance.status ?? 1);
const careIndex = spawnSync(process.execPath, ['scripts/build-care-index.mjs'], { stdio: 'inherit' });
if (careIndex.error) throw careIndex.error;
if (careIndex.status !== 0) process.exit(careIndex.status ?? 1);

const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITALCKM_AZURE_BUILD: '1' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!existsSync('dist/client/index.html')) throw new Error('Missing static export: dist/client/index.html');
copyFileSync('azure/staticwebapp.config.json', 'dist/client/staticwebapp.config.json');
console.log('Azure deployment files are ready in dist/client/');
