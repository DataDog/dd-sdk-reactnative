/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { UserInfoSingleton } from '../../sdk/UserInfoSingleton/UserInfoSingleton';
import { __ddEnrichEvaluationContextWithRumUser } from '../rumIntegration';

describe('__ddEnrichEvaluationContextWithRumUser', () => {
    beforeEach(() => {
        UserInfoSingleton.reset();
        jest.spyOn(InternalLog, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('normalizes the application context when no RUM user is available', () => {
        const context = {
            targetingKey: 'explicit-user',
            email: undefined
        };

        expect(__ddEnrichEvaluationContextWithRumUser(context)).toStrictEqual({
            targetingKey: 'explicit-user'
        });
        expect(context).toStrictEqual({
            targetingKey: 'explicit-user',
            email: undefined
        });
        expect(InternalLog.log).toHaveBeenCalledTimes(1);
        expect(InternalLog.log).toHaveBeenCalledWith(
            expect.stringContaining('No RUM user is set'),
            SdkVerbosity.WARN
        );
    });

    it('adds flat primitive RUM user properties and lets explicit context win', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            extraInfo: {
                company_name: 'Example, Inc.',
                age: 42,
                active: true,
                nullable: null,
                missing: undefined,
                profile: { plan: 'enterprise' },
                roles: ['admin']
            }
        });

        expect(
            __ddEnrichEvaluationContextWithRumUser({
                targetingKey: 'explicit-user',
                email: 'explicit@example.com',
                request_attribute: 'request-value'
            })
        ).toEqual({
            targetingKey: 'explicit-user',
            name: 'RUM Name',
            email: 'explicit@example.com',
            company_name: 'Example, Inc.',
            age: 42,
            active: true,
            nullable: null,
            request_attribute: 'request-value'
        });
        expect(InternalLog.log).toHaveBeenCalledTimes(3);
        for (const key of ['missing', 'profile', 'roles']) {
            expect(InternalLog.log).toHaveBeenCalledWith(
                expect.stringContaining(
                    `RUM user property "${key}" is not a string, number, boolean, or null`
                ),
                SdkVerbosity.WARN
            );
        }
    });

    it('preserves null RUM attributes unless explicitly overridden or removed', () => {
        const extraInfo = {
            nullable: null,
            overridden: null,
            removed: null,
            plan: 'pro'
        };
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            extraInfo
        });
        const context = {
            overridden: 'application-value',
            removed: undefined,
            plan: null
        };

        expect(__ddEnrichEvaluationContextWithRumUser(context)).toStrictEqual({
            targetingKey: 'rum-user',
            nullable: null,
            overridden: 'application-value',
            plan: null
        });
        expect(context).toStrictEqual({
            overridden: 'application-value',
            removed: undefined,
            plan: null
        });
        expect(extraInfo).toStrictEqual({
            nullable: null,
            overridden: null,
            removed: null,
            plan: 'pro'
        });
        expect(InternalLog.log).not.toHaveBeenCalled();
    });

    it('preserves an explicitly empty targeting key', () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user' });

        expect(
            __ddEnrichEvaluationContextWithRumUser({ targetingKey: '' })
        ).toEqual({ targetingKey: '' });
    });

    it('uses explicitly undefined fields to remove RUM defaults', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { plan: 'pro' }
        });

        expect(
            __ddEnrichEvaluationContextWithRumUser({
                targetingKey: undefined,
                email: undefined,
                plan: undefined,
                request_attribute: 'request-value'
            })
        ).toStrictEqual({ request_attribute: 'request-value' });
    });

    it('uses the latest RUM user each time it is called', () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user-a' });
        expect(__ddEnrichEvaluationContextWithRumUser({})).toEqual({
            targetingKey: 'rum-user-a'
        });

        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user-b',
            extraInfo: { plan: 'pro' }
        });
        expect(__ddEnrichEvaluationContextWithRumUser({})).toEqual({
            targetingKey: 'rum-user-b',
            plan: 'pro'
        });
    });

    it.each(['extraInfo', 'custom property'])(
        'keeps the RUM user fields when %s cannot be read',
        unreadable => {
            const user = {
                id: 'rum-user',
                name: 'RUM Name',
                email: 'rum@example.com',
                extraInfo: { plan: 'pro' }
            };
            Object.defineProperty(
                unreadable === 'extraInfo' ? user : user.extraInfo,
                unreadable === 'extraInfo' ? 'extraInfo' : 'broken',
                {
                    enumerable: true,
                    get: () => {
                        throw new Error('cannot read user property');
                    }
                }
            );
            UserInfoSingleton.getInstance().setUserInfo(user);

            expect(
                __ddEnrichEvaluationContextWithRumUser({ region: 'us' })
            ).toStrictEqual({
                targetingKey: 'rum-user',
                name: 'RUM Name',
                email: 'rum@example.com',
                region: 'us'
            });
            expect(InternalLog.log).toHaveBeenCalledTimes(1);
            expect(InternalLog.log).toHaveBeenCalledWith(
                'Some RUM user properties could not be read (cannot read user property) and were not added to the evaluation context.',
                SdkVerbosity.WARN
            );
        }
    );

    it('preserves application overrides and tombstones when extraInfo cannot be read', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            get extraInfo() {
                throw new Error('cannot read extraInfo');
            }
        });
        const context = {
            targetingKey: 'explicit-user',
            name: undefined,
            email: 'application@example.com'
        };

        expect(__ddEnrichEvaluationContextWithRumUser(context)).toStrictEqual({
            targetingKey: 'explicit-user',
            email: 'application@example.com'
        });
        expect(context).toHaveProperty('name', undefined);
    });

    it.each(['name', 'email', 'id'])(
        'keeps custom properties when the RUM user %s cannot be read',
        field => {
            const user = {
                id: 'rum-user',
                name: 'RUM Name',
                email: 'rum@example.com',
                extraInfo: {
                    plan: 'pro',
                    targetingKey: 'custom-user',
                    name: 'custom-name',
                    email: 'custom@example.com'
                }
            };
            UserInfoSingleton.getInstance().setUserInfo(user);
            Object.defineProperty(user, field, {
                get: () => {
                    throw new Error(`cannot read ${field}`);
                }
            });

            expect(
                __ddEnrichEvaluationContextWithRumUser({ region: 'us' })
            ).toStrictEqual({
                plan: 'pro',
                targetingKey: 'custom-user',
                name: 'custom-name',
                email: 'custom@example.com',
                region: 'us'
            });
            expect(InternalLog.log).toHaveBeenCalledTimes(1);
            expect(InternalLog.log).toHaveBeenCalledWith(
                `Some RUM user fields could not be read (cannot read ${field}) and were not added to the evaluation context.`,
                SdkVerbosity.WARN
            );
        }
    );

    it.each(['custom-value', 42, true, null])(
        'merges custom identity attributes with value %p when RUM identity fields are absent',
        value => {
            const extraInfo = {
                targetingKey: value,
                name: value,
                email: value,
                plan: 'pro'
            };
            UserInfoSingleton.getInstance().addUserExtraInfo(extraInfo);

            expect(__ddEnrichEvaluationContextWithRumUser({})).toStrictEqual(
                extraInfo
            );
            expect(InternalLog.log).not.toHaveBeenCalled();
        }
    );

    it('merges extraInfo, then RUM identity fields, then application context', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            extraInfo: {
                targetingKey: 'custom-user',
                name: 'custom-name',
                email: 'custom@example.com',
                plan: 'pro'
            }
        });

        expect(__ddEnrichEvaluationContextWithRumUser({})).toStrictEqual({
            targetingKey: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com',
            plan: 'pro'
        });
        expect(
            __ddEnrichEvaluationContextWithRumUser({
                targetingKey: 'application-user',
                name: 'Application Name',
                email: 'application@example.com'
            })
        ).toStrictEqual({
            targetingKey: 'application-user',
            name: 'Application Name',
            email: 'application@example.com',
            plan: 'pro'
        });
        expect(
            __ddEnrichEvaluationContextWithRumUser({
                targetingKey: undefined,
                name: undefined,
                email: undefined
            })
        ).toStrictEqual({ plan: 'pro' });
        expect(InternalLog.log).not.toHaveBeenCalled();
    });

    it('reads each RUM user field once and uses the validated value', () => {
        const getters = {
            id: jest.fn().mockReturnValueOnce('rum-user').mockReturnValue(42),
            name: jest.fn().mockReturnValueOnce('RUM Name').mockReturnValue(42),
            email: jest
                .fn()
                .mockReturnValueOnce('rum@example.com')
                .mockReturnValue(42)
        };
        const user = {};
        for (const [key, get] of Object.entries(getters)) {
            Object.defineProperty(user, key, { get });
        }
        jest.spyOn(
            UserInfoSingleton.getInstance(),
            'getUserInfo'
        ).mockReturnValue(user);

        expect(__ddEnrichEvaluationContextWithRumUser({})).toStrictEqual({
            targetingKey: 'rum-user',
            name: 'RUM Name',
            email: 'rum@example.com'
        });
        for (const get of Object.values(getters)) {
            expect(get).toHaveBeenCalledTimes(1);
        }
        expect(InternalLog.log).not.toHaveBeenCalled();
    });

    it('normalizes application context and logs once when reading the RUM user fails', () => {
        jest.spyOn(
            UserInfoSingleton.getInstance(),
            'getUserInfo'
        ).mockImplementation(() => {
            throw new Error('cannot read user');
        });

        expect(
            __ddEnrichEvaluationContextWithRumUser({
                targetingKey: 'explicit-user',
                email: undefined
            })
        ).toStrictEqual({ targetingKey: 'explicit-user' });
        expect(InternalLog.log).toHaveBeenCalledTimes(1);
        expect(InternalLog.log).toHaveBeenCalledWith(
            'Could not read the RUM user (cannot read user). No RUM values were added to the evaluation context.',
            SdkVerbosity.WARN
        );
    });

    it('returns unreadable application context unchanged and logs the fallback', () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user' });
        const context = {
            region: 'us',
            email: undefined,
            get broken() {
                throw new Error('cannot read application context');
            }
        };

        expect(__ddEnrichEvaluationContextWithRumUser(context)).toBe(context);
        expect(InternalLog.log).toHaveBeenCalledTimes(1);
        expect(InternalLog.log).toHaveBeenCalledWith(
            'Could not read the application evaluation context (cannot read application context). Returning it unchanged, without the RUM user.',
            SdkVerbosity.WARN
        );
    });

    it.each([
        ['non-Error value', 'failure'],
        [
            'unreadable message',
            Object.defineProperty(new Error(), 'message', {
                get: () => {
                    throw new Error('cannot read message');
                }
            })
        ],
        [
            'uncoercible message',
            Object.defineProperty(new Error(), 'message', {
                value: {
                    toString: () => {
                        throw new Error('cannot coerce message');
                    }
                }
            })
        ],
        [
            'unreadable prototype',
            new Proxy(new Error(), {
                getPrototypeOf: () => {
                    throw new Error('cannot read prototype');
                }
            })
        ]
    ])('safely logs a %s thrown by a user getter', (_description, error) => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            get extraInfo() {
                throw error;
            }
        });

        expect(__ddEnrichEvaluationContextWithRumUser({})).toStrictEqual({
            targetingKey: 'rum-user'
        });
        expect(InternalLog.log).toHaveBeenCalledTimes(1);
        expect(InternalLog.log).toHaveBeenCalledWith(
            'Some RUM user properties could not be read (unknown error) and were not added to the evaluation context.',
            SdkVerbosity.WARN
        );
    });
});
