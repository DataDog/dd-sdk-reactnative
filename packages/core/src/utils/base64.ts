/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * From https://github.com/eranbo/react-native-base64/blob/master/base64.js
 */

const keyStr =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const base64 = {
    decode: (input: string) => {
        let output = '';

        // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
        const base64test = /[^A-Za-z0-9+/=]/g;
        if (base64test.exec(input)) {
            throw new Error(
                'There were invalid base64 characters in the input text.\n' +
                    "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                    'Expect errors in decoding.'
            );
        }
        const sanitizedInput = input.replace(/[^A-Za-z0-9+/=]/g, '');

        let i = 0;
        do {
            const enc1 = keyStr.indexOf(sanitizedInput.charAt(i++));
            const enc2 = keyStr.indexOf(sanitizedInput.charAt(i++));
            const enc3 = keyStr.indexOf(sanitizedInput.charAt(i++));
            const enc4 = keyStr.indexOf(sanitizedInput.charAt(i++));

            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(chr1);

            if (enc3 !== 64) {
                output += String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output += String.fromCharCode(chr3);
            }
        } while (i < sanitizedInput.length);

        return output;
    }
};
