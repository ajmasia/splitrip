/**
 * Commit messages follow Conventional Commits.
 *
 * The history is the source of the changelog and of the version bump, so the
 * format is enforced rather than trusted: a malformed message never reaches
 * the log.
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'body-max-line-length': [1, 'always', 100],
  },
}

export default config
