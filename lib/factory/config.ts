export const FACTORY = {
  repo: { owner: 'andrelandgraf', name: 'vibecastly' },
  headBranch: 'feat/addons',
  baseBranch: 'demo/main',
  fallbackLabel: 'demo-fallback',
  devBranchName: 'dev/addons',
  previewBranchPrefix: 'preview/pr-',
  neon: { projectId: 'summer-credit-62081215', orgId: 'org-summer-dust-66593634' },
  vercel: { teamId: 'team_3lnclzRbyCETAcu719mQjKVP', projectId: 'prj_GbWkW4Y9DLl7WEXeXcjQYorFHUZn' },
  pr: {
    title: 'Addons: tag items and background images in prompts',
    body: [
      'Adds addons to vibecastly: items and background images you can `@`-tag next to people.',
      '',
      '- New `addons` table (Drizzle migration `0001_addons`) and an `addons` bucket in `neon.ts`',
      '- Function routes: `GET/POST /addons`, `DELETE /addons/:id`, and addon images as generation references',
      '- Addons panel and `@` mentions with a kind badge in the composer',
      '',
      'Opened by the Software Factory.',
    ].join('\n'),
  },
  // Live preview workflow must be green by then, measured from the PR opening.
  fallbackAfterMs: 180_000,
} as const;

export const LINKS = {
  repo: `https://github.com/${FACTORY.repo.owner}/${FACTORY.repo.name}`,
  actions: `https://github.com/${FACTORY.repo.owner}/${FACTORY.repo.name}/actions`,
  neonProject: `https://console.neon.tech/app/projects/${FACTORY.neon.projectId}`,
  neonBranch: (branchId: string) =>
    `https://console.neon.tech/app/projects/${FACTORY.neon.projectId}/branches/${branchId}`,
  vercelProject: 'https://vercel.com/andrelandgraf/vibecastly',
  production: 'https://vibecastly.vercel.app',
} as const;
