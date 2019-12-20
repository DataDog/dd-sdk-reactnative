
import { NativeModules } from 'react-native';

const { RNSdkModule } = NativeModules;

async function initWithEndpoint(clientToken, endpointUrl) {
   await RNSdkModule.initWithEndpoint(clientToken, endpointUrl)
}

async function init(clientToken) {
   await RNSdkModule.init(clientToken)
}

export default{
    init,
    initWithEndpoint,
};