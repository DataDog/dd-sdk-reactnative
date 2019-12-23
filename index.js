
import { NativeModules } from 'react-native';

const { RNSdkModule } = NativeModules;

async function initializeWithEndpoint(clientToken, endpointUrl) {
   await RNSdkModule.initializeWithEndpoint(clientToken, endpointUrl);
}

async function initialize(clientToken) {
   await RNSdkModule.initialize(clientToken);
}

export default{
    initializeWithEndpoint,
    initialize,
};
