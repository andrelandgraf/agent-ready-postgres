import { reset } from '@/lib/factory/actions';

const report = await reset();
console.log(
  [
    `Closed PRs: ${report.closedPrs.map((n) => `#${n}`).join(', ') || 'none'}`,
    `Deleted branches: ${report.deletedBranches.join(', ') || 'none'}`,
    `Deleted deployments: ${report.deletedDeployments.join(', ') || 'none'}`,
  ].join('\n'),
);
