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
import type { LocationDetailNavigationProp } from '../types';
import { CommonStyles as styles } from '../../../../common/styles';
import RickMortyService from '../service/rickMorty';
import { useNavigation } from '@react-navigation/native';
import type { Location } from '../service/types';
function LocationsScreen(): React.JSX.Element {
    const navigation = useNavigation<LocationDetailNavigationProp>();
    const [nextPage, setNextPage] = useState<number | undefined>(undefined);
    const [locationData, setLocationData] = useState<Location[]>([]);

    useEffect(() => {
        getLocations();
    }, []);

    const getLocations = (page? :number) => {
        RickMortyService.fetchLocations(page).then((data) => {
            const next = data?.info?.next ? parseInt(data.info.next.split("=")[1], 10) : undefined;
            setLocationData([ ...locationData, ...data.results]);
            setNextPage(next);
        }).catch((error) => {
            Alert.alert("Something went wrong. Please try again later.", error);
            setLocationData([]);
            setNextPage(undefined);
        });
    };

    const showLocationDetail = (location: Location) => {
        navigation.navigate('LocationDetail', { location, origin: 'Locations'});
    };

    const renderLocationCell = ({item}: {item: Location} ) => {
        return(
            <Pressable
                style={styles.resultCell}
                key={item.id}
                onPress={() => { showLocationDetail(item)}}
            >
                    <View style={styles.cellContent}>
                    <Text style={styles.cellTitle}>{item.name}</Text>
                    <Text>{item.type}</Text>
                    <Text>{item.dimension}</Text>
                </View>

            </Pressable>
        );
    };

    const onEndReached = () => {
        nextPage && getLocations(nextPage);
    };
    
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.listContainer}>
                <FlatList
                    data={locationData}
                    scrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    renderItem={renderLocationCell}
                    onEndReachedThreshold={0.5}
                    onEndReached={onEndReached}
                    style={styles.resultList}
                />
            </View>
        </SafeAreaView>
    );
};

export default LocationsScreen;