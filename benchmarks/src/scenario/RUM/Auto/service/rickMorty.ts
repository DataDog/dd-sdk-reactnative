/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */


const BASE_URL = "https://rickandmortyapi.com/api";
const CHARACTERS_ENDPOINT = "character";
const LOCATIONS_ENDPOINT = "location";
const EPISODES_ENDPOINT = "episode";

const MAX_CONCURRENT_REQUESTS = 1;
const REQUEST_DELAY_MS = 600;
interface QueuedRequest {
    url: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

class RickMortyService {
    private requestQueue: QueuedRequest[] = [];
    private activeRequests = 0;
    private isProcessing = false;

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0 && this.activeRequests < MAX_CONCURRENT_REQUESTS) {
            const request = this.requestQueue.shift();
            if (!request) break;

            this.activeRequests++;

            try {
                await this.delay(REQUEST_DELAY_MS);

                const response = await fetch(request.url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                request.resolve(data);
            } catch (error) {
                request.reject(error);
            } finally {
                this.activeRequests--;
            }
        }

        this.isProcessing = false;

        if (this.requestQueue.length > 0) {
            this.processQueue();
        }
    }

    fetchRequest(url: string, page?: number): Promise<any> {
        const fullURL = url + (page ? `?page=${page}` : '');

        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                url: fullURL,
                resolve,
                reject
            });

            this.processQueue();
        });
    }

    private extractIdFromUrl(url: string): string | null {
        const match = url.match(/\/(\d+)$/);
        return match ? match[1] : null;
    }

    private async fetchByIds(endpoint: string, urls: string[], _resourceType: string): Promise<any[]> {
        const ids = urls.map(url => this.extractIdFromUrl(url)).filter(Boolean);
        if (ids.length === 0) return [];

        const batchUrl = `${BASE_URL}/${endpoint}/${ids.join(',')}`;

        try {
            const response = await fetch(batchUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        } catch (error) {
            throw error;
        }
    }

    fetchCharacters(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + CHARACTERS_ENDPOINT, page);
    }

    fetchLocations(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + LOCATIONS_ENDPOINT, page);
    }

    fetchEpisodes(page?: number) {
        return this.fetchRequest(BASE_URL + "/" + EPISODES_ENDPOINT, page);
    }

    fetchCharactersByIds(urls: string[]): Promise<any[]> {
        return this.fetchByIds(CHARACTERS_ENDPOINT, urls, 'characters');
    }

    fetchEpisodesByIds(urls: string[]): Promise<any[]> {
        return this.fetchByIds(EPISODES_ENDPOINT, urls, 'episodes');
    }

    fetchLocationsByIds(urls: string[]): Promise<any[]> {
        return this.fetchByIds(LOCATIONS_ENDPOINT, urls, 'locations');
    }
};

export default new RickMortyService();
