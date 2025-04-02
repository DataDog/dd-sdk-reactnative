// import * as Keychain from 'react-native-keychain';
//
// const SERVICE_NAME = 'test_service';
//
// export async function storeCredentials(username: string, password: string) {
//   try {
//     await Keychain.setGenericPassword(username, password, {
//       service: SERVICE_NAME,
//       accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
//       accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
//       securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
//     });
//     console.log('Credentials stored successfully');
//   } catch (err) {
//     console.error('Error string credentials: ', err);
//   }
// }
//
// export async function retrieveCredentials() {
//   try {
//     const credentials = await Keychain.getGenericPassword({
//       service: SERVICE_NAME,
//       authenticationPrompt: {title: 'Authenticate to retrieve credentials'},
//     });
//
//     if (credentials) {
//       console.log('Retrieved credentials: ', credentials);
//       return credentials;
//     } else {
//       console.log('No credentials stored');
//       return null;
//     }
//   } catch (err) {
//     console.error('Biometrics authentication failed: ', err);
//   }
// }
//
// export async function resetCredentials() {
//   try {
//     await Keychain.resetGenericPassword({service: SERVICE_NAME});
//     console.log('Credentials removed');
//   } catch (err) {
//     console.error('Error removing credentials: ', err);
//   }
// }
