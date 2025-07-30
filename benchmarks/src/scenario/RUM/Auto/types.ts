/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TestConfig } from "benchmarks/src/testSetup/types/testConfig";
import type { Character, Location, Episode } from "./service/types";

export type RUMAutoScenarioProps = {
    testConfig?: TestConfig,
};

export interface CharacterNavigationParams {
    character: Character;
    origin: string;
};

export interface LocationNavigationParams {
    location: Location;
    origin: string;
};

export interface EpisodeNavigationParams {
    episode: Episode;
    origin: string;
};

export type RootStackParamList = {
  Tabs: undefined;
  CharacterDetail: CharacterNavigationParams;
  LocationDetail: LocationNavigationParams;
  EpisodeDetail: EpisodeNavigationParams;
};

export type CharacterDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CharacterDetail'>;
export type EpisodeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EpisodeDetail'>;
export type LocationDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LocationDetail'>;