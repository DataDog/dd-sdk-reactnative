  
import {
  View,
  Image,
  FlatList,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused, useRoute } from '@react-navigation/native';
import { CommonStyles as styles } from '../../../common/styles';
import { RunType } from "../../../testSetup/types/testConfig";
import { instrument } from "../../../testSetup/testUtils";
import {DdLogs} from '@datadog/mobile-react-native';
import { Logger } from '../../../testSetup/logger';
import { LogLevel, PAYLOADS_BY_SIZE, PayloadSize } from '../types';
import type { LogsHeavyTrafficConfigParams, ImageListProps } from '../types';
import { DEFAULT_LOGS_PER_BATCH, DEFAULT_LOG_MESSAGE, DEFAULT_HEAVY_IMAGE_URL, DEFAULT_IMAGES_TO_LOAD } from '../constants';

function ImageListScreen(props: ImageListProps): React.JSX.Element {
    const route = useRoute();
    const logger = useRef(Logger);
    const isFocused = useIsFocused();
    const [readyToRun, setReadyToRun] = useState(false);

    const params: LogsHeavyTrafficConfigParams = route?.params as LogsHeavyTrafficConfigParams;
    const logMessage = params?.logMessage || DEFAULT_LOG_MESSAGE;
    const logLevel = params?.logLevel || LogLevel.DEBUG;
    const payloadSize = params?.payloadSize || PayloadSize.Small;
    const logsPerBatch = params?.logsPerBatch || DEFAULT_LOGS_PER_BATCH;

    useEffect(() => {
        if (props.testConfig?.runType !== RunType.BASELINE) {
            instrument().then(() => {
                logger.current = DdLogs;
                setReadyToRun(true);
            });
        }

    }, []);

    const log = () => {
        for (let i = 0; i < logsPerBatch; i++) {
            switch (logLevel) {
                case LogLevel.DEBUG:
                logger.current.debug(logMessage, PAYLOADS_BY_SIZE[payloadSize]);
                break;
                case LogLevel.ERROR:
                logger.current.error(logMessage, PAYLOADS_BY_SIZE[payloadSize]);
                break;
                case LogLevel.INFO:
                logger.current.info(logMessage, PAYLOADS_BY_SIZE[payloadSize]);
                break;
                case LogLevel.WARN:
                logger.current.warn(logMessage, PAYLOADS_BY_SIZE[payloadSize]);
                break;
            }
        }
    }

    const HeavyImage = ({ url }: { url: string }) => {
        useEffect(() => {
            log();
        }, []);

        return <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />;
    };

    const renderImage = ({ item }: { item: { url: string } }) => (
        <HeavyImage url={item.url} />
    );

    const imageData = Array.from({ length: DEFAULT_IMAGES_TO_LOAD }, (_, index) => ({
        key: index.toString(),
        url: `${DEFAULT_HEAVY_IMAGE_URL}${index}`,
    }));

    return (
        <View style={styles.container}>
            {readyToRun && isFocused && (
                <FlatList
                    data={imageData}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderImage}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.imageContainer}
                />
            )}
        </View>
    )
}

export default ImageListScreen;