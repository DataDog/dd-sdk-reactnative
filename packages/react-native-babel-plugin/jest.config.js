module.exports = {
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest'
    },
    transformIgnorePatterns: ['node_modules/(?!(uuid)/)']
};
