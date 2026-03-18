import { useState } from 'react';
import { View, Text, Button } from 'react-native';

import styles from './styles';
import { DdTrace, InternalLog, SdkVerbosity } from '@datadog/mobile-react-native';

const TraceScreen = () => {
    const [spanIds, setSpanIds] = useState<string[]>([]);

    return (
        <View style={styles.defaultScreen}>
            <Text style={{ marginBottom: 20 }}>
                Trace test
            </Text>
            <View style={{ marginTop: 20 }} />
            <Button
                title="Start Span"
                onPress={async () => {
                    const newSpanId = await DdTrace.startSpan("span_operation_" +   Math.floor(100 + Math.random() * 900));
                    InternalLog.log(`SpanId: ${newSpanId}`, SdkVerbosity.DEBUG);
                    spanIds.push(newSpanId);
                    setSpanIds(spanIds);
                }}
            />
            <View style={{ marginTop: 20 }} />
            <Button
                title="Finish Span"
                onPress={() => {
                    const lastSpan = spanIds.pop();
                    lastSpan && DdTrace.finishSpan(lastSpan);
                    setSpanIds(spanIds)
                }}
            />
        </View>
    );
};

export default TraceScreen;
