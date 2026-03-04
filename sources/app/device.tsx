import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

function getParamValue(value: string | string[] | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
}

export default function DeviceCodeEntryRedirect() {
    const params = useLocalSearchParams<{ code?: string | string[]; userCode?: string | string[] }>();
    const code = getParamValue(params.code) || getParamValue(params.userCode);

    if (code) {
        return <Redirect href={{ pathname: '/restore/device-code', params: { code } }} />;
    }
    return <Redirect href="/restore/device-code" />;
}

