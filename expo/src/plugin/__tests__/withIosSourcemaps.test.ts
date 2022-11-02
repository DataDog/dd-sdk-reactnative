import { withXcodeProject } from '@expo/config-plugins';

import withIosSourcemaps from '../withIosSourcemaps/withIosSourcemaps';
import pristineProject from './__fixtures__/pristineProjectPbxproj.json';
import sentryProject from './__fixtures__/sentryProjectPbxproj.json';

jest.mock('@expo/config-plugins', () => {
    return {
        ...(jest.requireActual('@expo/config-plugins') as object),
        withXcodeProject: jest.fn()
    };
});

const mockXcodeProject = (mock: object) => {
    const xcodeProject = { ...mock };
    // @ts-ignore
    withXcodeProject.mockImplementationOnce((config, callback) => {
        // @ts-ignore
        return callback({
            ...config,
            modResults: {
                pbxItemByComment: () => xcodeProject
            },
            xcodeProject
        });
    });
};

/**
 * This must return a new instance each time to avoid overriding the same object
 * on different tests
 */
const createFakeConfig = () => ({
    name: 'project name',
    slug: 'project-name'
});

describe('withIosSourcemaps', () => {
    beforeEach(() => {
        (withXcodeProject as any).mockClear();
    });
    describe('on pristine project', () => {
        it('adds script to upload sourcemaps to Datadog', async () => {
            mockXcodeProject(pristineProject);
            const result = (await withIosSourcemaps(createFakeConfig())) as any;
            expect(result.xcodeProject.shellScript).toMatchInlineSnapshot(
                `"\\"if [[ -f \\\\\\"$PODS_ROOT/../.xcode.env\\\\\\" ]]; then\\\\n  source \\\\\\"$PODS_ROOT/../.xcode.env\\\\\\"\\\\nfi\\\\nif [[ -f \\\\\\"$PODS_ROOT/../.xcode.env.local\\\\\\" ]]; then\\\\n  source \\\\\\"$PODS_ROOT/../.xcode.env.local\\\\\\"\\\\nfi\\\\n\\\\n# The project root by default is one level up from the ios directory\\\\nexport PROJECT_ROOT=\\\\\\"$PROJECT_DIR\\\\\\"/..\\\\n\\\\nif [[ \\\\\\"$CONFIGURATION\\\\\\" = *Debug* ]]; then\\\\n  export SKIP_BUNDLING=1\\\\nfi\\\\nexport SOURCEMAP_FILE=./main.jsbundle.map\\\\n yarn datadog-ci react-native xcode \`node --print \\\\\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\\\\"\`\\\\n\\\\n\\""`
            );
        });
    });
    describe('on projects implementing Sentry', () => {
        it('adds script to upload sourcemaps to Datadog', async () => {
            mockXcodeProject(sentryProject);
            const result = (await withIosSourcemaps(createFakeConfig())) as any;
            expect(result.xcodeProject.shellScript).toMatchInlineSnapshot(
                `"\\"export SENTRY_PROPERTIES=sentry.properties\\\\nexport EXTRA_PACKAGER_ARGS=\\\\\\"--sourcemap-output $DERIVED_FILE_DIR/main.jsbundle.map\\\\\\"\\\\nif [[ -f \\\\\\"$PODS_ROOT/../.xcode.env\\\\\\" ]]; then\\\\n  source \\\\\\"$PODS_ROOT/../.xcode.env\\\\\\"\\\\nfi\\\\nif [[ -f \\\\\\"$PODS_ROOT/../.xcode.env.local\\\\\\" ]]; then\\\\n  source \\\\\\"$PODS_ROOT/../.xcode.env.local\\\\\\"\\\\nfi\\\\n\\\\n# The project root by default is one level up from the ios directory\\\\nexport PROJECT_ROOT=\\\\\\"$PROJECT_DIR\\\\\\"/..\\\\n\\\\nif [[ \\\\\\"$CONFIGURATION\\\\\\" = *Debug* ]]; then\\\\n  export SKIP_BUNDLING=1\\\\nfi\\\\n\`node --print \\\\\\"require.resolve('@sentry/cli/package.json').slice(0, -13) + '/bin/sentry-cli'\\\\\\"\` react-native xcode --force-foreground \`node --print \\\\\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\\\\"\`\\\\n\\\\n\\\\n yarn datadog-ci react-native xcode \`node --print \\\\\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\\\\"\`\\""`
            );
        });
    });
});
