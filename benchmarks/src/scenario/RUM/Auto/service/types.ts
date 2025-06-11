/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export interface Character {
    id: number;
    name: string;
    species: string;
    status: string;
    gender: string;
    image: string;
    origin: {
        name: string;
        url: string;
    },
    episode: string[];
};

export interface Location {
    id: string;
    dimension: string;
    name: string;
    residents: string[];
    type: string;
    created: string;
};

export interface Episode {
    id: number;
    name: string;
    episode: string;
    air_date: string;
    created: string;
    characters: string[];
};