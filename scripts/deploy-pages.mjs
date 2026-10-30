// Builds the app for GitHub Pages (served from /<repo>/) and pushes dist/ to the gh-pages branch.
import { execSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const remote = execSync('git remote get-url origin').toString().trim();
const repo = remote.replace(/\.git$/, '').split('/').pop();

run('npm run build', { env: { ...process.env, BASE_PATH: `/${repo}/`, MSYS_NO_PATHCONV: '1' } });
// Single-page app: serve index.html for deep links such as /practice.
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');

run('git init -q -b gh-pages', { cwd: 'dist' });
run('git add -A', { cwd: 'dist' });
run('git commit -q -m "Deploy"', { cwd: 'dist' });
run(`git push -q -f ${remote} gh-pages`, { cwd: 'dist' });
console.log(`Deployed. Live in a minute at https://${remote.split('/')[3]}.github.io/${repo}/`);
