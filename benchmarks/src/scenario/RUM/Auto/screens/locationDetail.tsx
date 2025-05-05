/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    Text,
    View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { CharacterDetailNavigationProp, LocationNavigationParams } from '../types';
import React, { useEffect, useState } from 'react';
import { CommonStyles as styles } from '../../../../common/styles';
import RickMortyService from '../service/rickMorty';
import type { Character } from '../service/types';

function LocationDetailScreen(): React.JSX.Element {
    const navigation = useNavigation<CharacterDetailNavigationProp>();
    const params = useRoute()?.params as LocationNavigationParams;
    const location = params?.location;
    const characterURLS = location.residents;
    const origin = params?.origin;
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        navigation.setOptions({ headerBackTitle: origin, headerTitle: ''});
        getCharacters();
    }, []);

    const getCharacters = async () => {
        try {
            setIsLoading(true);
            const charaterList = await Promise.all(characterURLS.map((url) =>
                RickMortyService.fetchRequest(url).then(json => json as Character)
            ));
            setCharacters(charaterList);
        } catch (_error) {
            Alert.alert("Something went wrong. Please try again later.");
        } finally {
            setIsLoading(false);
        };
    };

    const showCharacterDetail = (character: Character) => {
        navigation.navigate('CharacterDetail', { character, origin: location.name});
    };

    const renderCharacter = ({item}: {item: Character}) => {
        return (

            <Pressable 
                key={item.id}
                onPress={() => showCharacterDetail(item)}
                style={styles.gridItem}
            >
                <Image source={{uri: item.image}} style={styles.gridImage}/>
                <Text 
                    style={styles.gridItemLabel} 
                    numberOfLines={1}
                    ellipsizeMode='tail'>
                        {item.name}
                </Text>
            </Pressable>
        );
    };

    
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.lightContainer}>
                <Text style={styles.detailTitle}>{location.name}</Text>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Type'}</Text>
                    <Text>{location.type}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Dimension'}</Text>
                    <Text>{location.dimension}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{'Created'}</Text>
                    <Text>{location.created}</Text>
                </View>
                {isLoading && <ActivityIndicator size='large' style={{marginTop: 100}}/>}
                <FlatList
                    data={characters}
                    scrollEnabled={true}
                    numColumns={3}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderCharacter}
                    style={styles.listContainer}
                />
            </View>
        </SafeAreaView>
    );
};

export default LocationDetailScreen;