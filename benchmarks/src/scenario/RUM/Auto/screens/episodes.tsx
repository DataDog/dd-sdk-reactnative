/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React, { useEffect, useState } from 'react';
import {
    Alert,
  FlatList,
  Pressable, 
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import type { EpisodeDetailNavigationProp } from '../types';
import { CommonStyles as styles } from '../../../../common/styles';
import RickMortyService from '../service/rickMorty';
import { useNavigation } from '@react-navigation/native';
import type { Episode } from '../service/types';

function EpisodesScreen(): React.JSX.Element {    
    const navigation = useNavigation<EpisodeDetailNavigationProp>();
    const [nextPage, setNextPage] = useState<number | undefined>(undefined);
    const [episodeData, setEpisodeData] = useState<Episode[]>([]);

    useEffect(() => {
        getEpisodes();
    }, []);

    const getEpisodes = (page? :number) => {
        RickMortyService.fetchEpisodes(page).then((data) => {
            const next = data?.info?.next ? parseInt(data.info.next.split("=")[1], 10) : undefined;
            setEpisodeData([ ...episodeData, ...data.results]);
            setNextPage(next);
        }).catch((error) => {
            Alert.alert("Something went wrong. Please try again later.", error);
            setEpisodeData([]);
            setNextPage(undefined);
        });
    };

    const showEpisodeDetail = (episode: Episode) => {
        navigation.navigate('EpisodeDetail', { episode, origin: 'Episodes'});
    };

    const renderEpisodeCell = ({item}: {item: Episode} ) => {
        return(
            <Pressable
                style={styles.resultCell}
                key={item.id}
                onPress={() => { showEpisodeDetail(item)}}
            >
                    <View style={styles.cellContent}>
                    <Text style={styles.cellTitle}>{item.name}</Text>
                    <Text>{item.episode}</Text>
                    <Text>{item.air_date}</Text>
                </View>

            </Pressable>
        );
    };

    const onEndReached = () => {
        nextPage && getEpisodes(nextPage);
    };
    
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.listContainer}>
                <FlatList
                    data={episodeData}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderEpisodeCell}
                    onEndReachedThreshold={0.5}
                    onEndReached={onEndReached}
                    style={styles.resultList}
                />
            </View>
        </SafeAreaView>
    );
};

export default EpisodesScreen;