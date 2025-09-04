/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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
import type { CharacterDetailNavigationProp } from '../types';
import { CommonStyles as styles } from '../../../../common/styles';
import RickMortyService from '../service/rickMorty';
import type { Character } from '../service/types';
import { useNavigation } from '@react-navigation/native';

function CharactersScreen(): React.JSX.Element {
    const navigation = useNavigation<CharacterDetailNavigationProp>();
    const [nextPage, setNextPage] = useState<number | undefined>(undefined);
    const [characterData, setCharacterData] = useState<Character[]>([]);

    useEffect(() => {
        getCharacters();
    }, []);

    const getCharacters = (page?: number) => {
        RickMortyService.fetchCharacters(page).then((data) => {
            const next = data?.info?.next ? parseInt(data.info.next.split("=")[1], 10) : undefined;
            setCharacterData([ ...characterData, ...data.results]);
            setNextPage(next);
        }).catch((error) => {
            Alert.alert("Something went wrong. Please try again later.", error);
            setCharacterData([]);
            setNextPage(undefined);
        });
    };

    const showCharacterDetail = (character: Character) => {
        navigation.navigate('CharacterDetail', { character, origin: 'Characters'});
    };

    const onEndReached = () => {
        nextPage && getCharacters(nextPage);
    };

    const renderCharacterCell =  ({item}: {item: Character} ) => {
        return (
            <Pressable 
                    style={styles.resultCell} 
                    key={item.id}
                    onPress={() => showCharacterDetail(item)}
                >
                <Image 
                    source={{uri: item.image}} 
                    style={styles.cellImage} 
                    resizeMode='contain'/>
                <View style={styles.cellContent}>
                    <Text style={styles.cellTitle}>{item.name}</Text>
                    <Text>{item.species}</Text>
                    <Text>{item.status}</Text>
                    <Text>{item.origin.name}</Text>
                </View>
                <Text style={styles.cellArrow}>{">"}</Text>
            </Pressable>
        );
    };
    
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.listContainer}>
                <FlatList
                    data={characterData}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderCharacterCell}
                    onEndReachedThreshold={0.5}
                    onEndReached={onEndReached}
                    style={styles.resultList}
                />
            </View>
        </SafeAreaView>
    );
};

export default CharactersScreen;