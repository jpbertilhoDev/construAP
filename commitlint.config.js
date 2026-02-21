export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert'],
        ],
        'scope-empty': [1, 'never'],
        'subject-case': [2, 'always', 'sentence-case'],
    },
}
