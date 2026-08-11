import React, {useState} from 'react';
import {StyleSheet, Text, View, Image, TouchableOpacity} from 'react-native';
import {colors} from '../theme';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

interface MenuCardProps {
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
}

const MenuCard = ({title, description, onPress, testID}: MenuCardProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[cardStyles.card, focused && cardStyles.cardFocused]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testID}
    >
      <Text style={[cardStyles.title, focused && cardStyles.textFocused]}>
        {title}
      </Text>
      <Text style={[cardStyles.description, focused && cardStyles.textFocused]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.border,
  },
  cardFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  textFocused: {
    color: colors.focusText,
  },
});

export const HomeScreen = ({onNavigate}: HomeScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/vega.png')} />
        <Text style={styles.title}>Datadog SDK - Vega</Text>
        <Text style={styles.subtitle}>
          Select a screen to test SDK functionality
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>Amazon Vega OS (Kepler)</Text>
          <Text style={styles.infoLabel}>SDK</Text>
          <Text style={styles.infoValue}>
            @datadog/mobile-react-native-vega
          </Text>
        </View>
      </View>
      <View style={styles.menu}>
        <MenuCard
          title="Feature Actions"
          description="Trigger each supported SDK feature one action at a time"
          onPress={() => onNavigate('featureActions')}
          testID="featureActionsLink"
        />
        <MenuCard
          title="Feature Scenarios"
          description="Run supported SDK scenarios for RUM, resources, actions, and operations"
          onPress={() => onNavigate('featureScenarios')}
          testID="featureScenariosLink"
        />
        <MenuCard
          title="Network Requests"
          description="Make HTTP requests and inspect RUM resource tracking"
          onPress={() => onNavigate('network')}
          testID="networkLink"
        />
        <MenuCard
          title="RUM Views"
          description="Start and stop RUM views to test view lifecycle tracking"
          onPress={() => onNavigate('rumViews')}
          testID="rumViewsLink"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 100,
  },
  header: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 100,
  },
  title: {
    color: colors.text,
    fontSize: 60,
    marginTop: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 30,
    marginTop: 10,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginTop: 20,
  },
  infoLabel: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  infoValue: {
    color: colors.text,
    fontSize: 20,
    marginBottom: 5,
  },
  menu: {
    flex: 1,
    justifyContent: 'center',
  },
});
