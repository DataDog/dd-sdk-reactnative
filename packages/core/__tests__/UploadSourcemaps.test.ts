import { spawnSync } from 'child_process';

it.skip('M call datadog-ci W android uploadReleaseSourcemaps', () => {
    // TODO this test requires the setup for the sample app and
    // creating datadog-sourcemaps.properties file. Should be automated in the future.
    // WHEN
    const { stdout } = spawnSync('./gradlew uploadReleaseSourcemaps --info', {
        cwd: 'example/android',
        shell: true
    });
    const result = stdout.toString('utf-8');

    // THEN
    expect(result).toContain(
        'yarn datadog-ci react-native upload --platform android' +
            ' --service com.example.ddsdkreactnative'
    );
    expect(result).toContain(
        'app/build/generated/assets/react/release/index.android.bundle'
    );
    expect(result).toContain(
        'app/build/generated/sourcemaps/react/release/index.android.bundle.map'
    );
});
