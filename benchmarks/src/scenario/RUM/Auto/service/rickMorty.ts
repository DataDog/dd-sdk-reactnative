/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */


const BASE_URL = "https://rickandmortyapi.com/api";
const CHARACTERS_ENDPOINT = "character";
const LOCATIONS_ENDPOINT = "location";
const EPISODES_ENDPOINT = "episode";

class RickMortyService {
    fetchRequest(url: string, page?: number) {
        const fullURL = url + (page ? ("?page=" + page.toString()) : '');
        return fetch(fullURL).then((data) => {
            return data.json();
        }).catch((_error) => {
            return Promise.reject();
        })
    };

    fetchCharacters(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + CHARACTERS_ENDPOINT, page);
    };

    fetchLocations(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + LOCATIONS_ENDPOINT, page);
    };

    fetchEpisodes(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + EPISODES_ENDPOINT, page);
    };
};

export default new RickMortyService();