import { TrackingConsent } from "dd-sdk-reactnative"
import AsyncStorage from '@react-native-async-storage/async-storage'

const TRACKING_CONSENT_KEY = 'tracking_consent'

export function getTrackingConsent(): Promise<TrackingConsent> {
    return AsyncStorage.getItem(TRACKING_CONSENT_KEY)
        .then(consent => {
            return consent != null ? TrackingConsent[consent.toLocaleUpperCase("en-us")] : TrackingConsent.PENDING
        })
        .catch(error => {
            console.error('Failed to read tracking consent', error)
            return TrackingConsent.PENDING
        })
}

export function saveTrackingConsent(consent: TrackingConsent): Promise<void> {
    return AsyncStorage.setItem(TRACKING_CONSENT_KEY, consent)
        .catch(error => {
            console.error('Failed to save tracking consent', error)
        })
}