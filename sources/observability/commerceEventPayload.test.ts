import { describe, expect, it } from 'vitest';
import {
    buildStructuredCommerceEventPayload,
    sanitizeStructuredCommerceProperties,
} from './commerceEventPayload';

describe('sanitizeStructuredCommerceProperties', () => {
    it('drops undefined values and truncates long strings', () => {
        const result = sanitizeStructuredCommerceProperties({
            keep_number: 3,
            drop_me: undefined,
            long_text: 'x'.repeat(400),
        });

        expect(result).toEqual({
            keep_number: 3,
            long_text: 'x'.repeat(256),
        });
    });

    it('returns undefined when no supported values remain', () => {
        expect(sanitizeStructuredCommerceProperties({ only_undefined: undefined })).toBeUndefined();
    });
});

describe('buildStructuredCommerceEventPayload', () => {
    it('normalizes optional strings and keeps structured properties', () => {
        const payload = buildStructuredCommerceEventPayload({
            name: 'paywall_result',
            flow: 'paywall',
            surface: '  voice-upsell  ',
            occurredAt: 123,
            properties: {
                result: 'purchased',
                restored: false,
            },
        }, {
            platform: 'ios',
            appVersion: '1.2.3',
        });

        expect(payload).toEqual({
            name: 'paywall_result',
            flow: 'paywall',
            surface: 'voice-upsell',
            platform: 'ios',
            appVersion: '1.2.3',
            occurredAt: 123,
            properties: {
                result: 'purchased',
                restored: false,
            },
        });
    });
});
