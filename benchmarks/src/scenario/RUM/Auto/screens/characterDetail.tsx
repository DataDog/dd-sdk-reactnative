/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    Text,
    View,
} from 'react-native';
import { CommonStyles as styles } from '../../../../common/styles';
import type { CharacterNavigationParams } from '../types';
import RickMortyService from '../service/rickMorty';

function CharacterDetailScreen(): React.JSX.Element {
    const navigation = useNavigation();
    const params = useRoute()?.params as CharacterNavigationParams;
    const character = params?.character;
    const episodeURLs = character.episode;
    const origin = params?.origin;
    const [episodes, setEpisodes] = useState <string[]>([]);
    
    useEffect(() => {
        navigation.setOptions({ headerBackTitle: origin, headerTitle: '' });
    }, []);

    const onShowEpisodes = async () => {
        try {
            const episodeNames = await Promise.all(episodeURLs.map((url) =>
                RickMortyService.fetchRequest(url).then(json => json.name)
            ));
            setEpisodes(episodeNames);
        } catch (_error) {
            Alert.alert("Something went wrong. Please try again later.");
        };
    };

    const renderEpisode = ({item}: {item: string}) => {
        return (
            <View style={styles.expandedContentEntry} key={item}>
                <Text>{item}</Text>
            </View>
        );
    };
    
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.lightContainer}>
                <Image source={{uri: character.image}} style={styles.detailImage}/>
                <Text style={styles.detailTitle}>{character.name}</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Name'}</Text>
                    <Text>{character.name}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Status'}</Text>
                    <Text>{character.status}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Species'}</Text>
                    <Text>{character.species}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Gender'}</Text>
                    <Text>{character.gender}</Text>
                </View>
                <Pressable onPress={onShowEpisodes}>
                    <Text style={styles.detailTitle}>{`Episodes: ${character.episode.length}`}</Text>
                </Pressable>
                <FlatList
                    data={episodes}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderEpisode}
                    style={styles.listContainer}
                />
            </View>
        </SafeAreaView>
    );
};

export default CharacterDetailScreen;