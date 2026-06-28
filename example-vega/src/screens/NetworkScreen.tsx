import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface NetworkScreenProps {
  onBack: () => void;
}

interface RequestResult {
  url: string;
  status: number | string;
  duration: number;
  timestamp: string;
}

const ENDPOINTS = [
  {name: 'GET httpbin/get', url: 'https://httpbin.org/get'},
  {name: 'GET httpbin/json', url: 'https://httpbin.org/json'},
  {name: 'GET httpbin/status/200', url: 'https://httpbin.org/status/200'},
  {name: 'GET httpbin/status/404', url: 'https://httpbin.org/status/404'},
];

interface EndpointButtonProps {
  name: string;
  url: string;
  onPress: () => void;
  testID: string;
}

const EndpointButton = ({name, url, onPress, testID}: EndpointButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      style={[buttonStyles.card, focused && buttonStyles.cardFocused]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}>
      <Text style={buttonStyles.name}>{name}</Text>
      <Text style={buttonStyles.url}>{url}</Text>
    </TouchableOpacity>
  );
};

interface ActionButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  testID: string;
}

const ActionButton = ({label, color, onPress, testID}: ActionButtonProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      style={[
        buttonStyles.action,
        {borderColor: color},
        focused && buttonStyles.actionFocused,
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}>
      <Text style={[buttonStyles.actionLabel, {color}]}>{label}</Text>
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: '#ff9900',
    backgroundColor: 'rgba(255, 153, 0, 0.12)',
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  url: {
    color: '#888888',
    fontSize: 18,
  },
  action: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionLabel: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export const NetworkScreen = ({onBack}: NetworkScreenProps) => {
  const [results, setResults] = useState<RequestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const makeRequest = useCallback(async (url: string) => {
    const start = Date.now();
    try {
      const response = await fetch(url);
      const duration = Date.now() - start;
      const result: RequestResult = {
        url,
        status: response.status,
        duration,
        timestamp: new Date().toLocaleTimeString(),
      };
      setResults(prev => [result, ...prev].slice(0, 10));
    } catch (error) {
      const duration = Date.now() - start;
      const result: RequestResult = {
        url,
        status: `Error: ${(error as Error).message}`,
        duration,
        timestamp: new Date().toLocaleTimeString(),
      };
      setResults(prev => [result, ...prev].slice(0, 10));
    }
  }, []);

  const runAllRequests = useCallback(async () => {
    setLoading(true);
    for (const endpoint of ENDPOINTS) {
      await makeRequest(endpoint.url);
    }
    setLoading(false);
  }, [makeRequest]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.sidebar}>
        <Text style={styles.title}>Network Requests</Text>
        {ENDPOINTS.map((endpoint, index) => (
          <EndpointButton
            key={index}
            name={endpoint.name}
            url={endpoint.url}
            onPress={() => makeRequest(endpoint.url)}
            testID={`endpoint-${index}`}
          />
        ))}

        <View style={styles.actions}>
          <ActionButton
            label={loading ? 'Running...' : 'Run All Requests'}
            color="#ff9900"
            onPress={runAllRequests}
            testID="runAll"
          />
          <ActionButton
            label="Back to Home"
            color="#aaaaaa"
            onPress={onBack}
            testID="backHome"
          />
        </View>
      </ScrollView>

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>Results</Text>
        <ScrollView style={styles.resultsList}>
          {results.length === 0 ? (
            <Text style={styles.emptyText}>
              No requests yet. Select an endpoint to start.
            </Text>
          ) : (
            results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultTime}>[{result.timestamp}]</Text>
                <Text
                  style={[
                    styles.resultStatus,
                    typeof result.status === 'number' && result.status < 400
                      ? styles.statusOk
                      : styles.statusError,
                  ]}>
                  {result.status}
                </Text>
                <Text style={styles.resultUrl} numberOfLines={1}>
                  {result.url}
                </Text>
                <Text style={styles.resultDuration}>{result.duration}ms</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    padding: 40,
  },
  sidebar: {
    flex: 2,
    paddingRight: 40,
    paddingLeft: 60,
  },
  title: {
    color: 'white',
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actions: {
    marginTop: 10,
  },
  results: {
    flex: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 20,
  },
  resultsTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  resultsList: {
    flex: 1,
  },
  emptyText: {
    color: '#888888',
    fontSize: 22,
    fontStyle: 'italic',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultTime: {
    color: '#888888',
    fontSize: 20,
    marginRight: 10,
  },
  resultStatus: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 10,
    width: 80,
  },
  statusOk: {
    color: '#44bb44',
  },
  statusError: {
    color: '#ff4444',
  },
  resultUrl: {
    color: 'white',
    fontSize: 20,
    flex: 1,
  },
  resultDuration: {
    color: '#ffaa00',
    fontSize: 20,
    marginLeft: 10,
  },
});
