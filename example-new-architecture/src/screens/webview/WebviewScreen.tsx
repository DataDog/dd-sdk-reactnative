import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
// import {WebView} from '@datadog/mobile-react-native-webview';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* <WebView */}
      {/*   allowedHosts={['localhost']} */}
      {/*   originWhitelist={['*']} */}
      {/*   source={{uri: 'http://localhost:3000'}} */}
      {/*   style={styles.webview} */}
      {/* /> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default App;
