/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

type TrackingStateModule = typeof import('../FetchProxyState');

const loadStateCopy = (): TrackingStateModule => {
    let copy!: TrackingStateModule;
    jest.isolateModules(() => {
        copy = jest.requireActual('../FetchProxyState');
    });
    return copy;
};

describe('FetchProxyState across module copies', () => {
    it('shares upload exclusion and XHR suppression with another core copy', () => {
        const first = loadStateCopy();
        const second = loadStateCopy();
        expect(first).not.toBe(second);

        first.callWithoutResourceTracking(() => {
            expect(second.isResourceTrackingDisabled()).toBe(true);
            expect(second.isRunningWithinFetchProxy()).toBe(true);
        });

        expect(second.isResourceTrackingDisabled()).toBe(false);
        expect(second.isRunningWithinFetchProxy()).toBe(false);
    });

    it('shares the Fetch depth without excluding ordinary Fetch resources', () => {
        const first = loadStateCopy();
        const second = loadStateCopy();

        first.callOriginalFetch(() => {
            expect(second.isRunningWithinFetchProxy()).toBe(true);
            expect(second.isResourceTrackingDisabled()).toBe(false);
        });

        expect(second.isRunningWithinFetchProxy()).toBe(false);
    });

    it('restores shared depths after nested calls throw across copies', () => {
        const first = loadStateCopy();
        const second = loadStateCopy();

        first.callWithoutResourceTracking(() => {
            expect(() =>
                second.callWithoutResourceTracking(() => {
                    throw new Error('request failed');
                })
            ).toThrow('request failed');
            expect(second.isResourceTrackingDisabled()).toBe(true);
            expect(second.isRunningWithinFetchProxy()).toBe(true);
        });

        expect(first.isResourceTrackingDisabled()).toBe(false);
        expect(second.isResourceTrackingDisabled()).toBe(false);
        expect(first.isRunningWithinFetchProxy()).toBe(false);
        expect(second.isRunningWithinFetchProxy()).toBe(false);
    });
});
