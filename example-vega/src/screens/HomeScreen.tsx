import React, {useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
      testID={testID}>
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
    padding: 26,
    marginRight: 20,
    borderWidth: 3,
    borderColor: colors.border,
    width: 370,
    height: 190,
    justifyContent: 'flex-end',
  },
  cardFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.focusSurface,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 19,
    lineHeight: 26,
  },
  textFocused: {
    color: colors.focusText,
  },
});

export const HomeScreen = ({onNavigate}: HomeScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            source={require('../assets/vega.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.title}>Datadog SDK</Text>
            <Text style={styles.subtitle}>Vega OS test application</Text>
          </View>
        </View>
        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PLATFORM</Text>
            <Text style={styles.infoValue}>Vega OS (Kepler)</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PACKAGE</Text>
            <Text style={styles.infoValue}>
              @datadog/mobile-react-native-vega
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>SDK test areas</Text>
        <ScrollView
          horizontal
          style={styles.menu}
          contentContainerStyle={styles.menuContent}
          showsHorizontalScrollIndicator={false}>
          <MenuCard
            title="Feature Actions"
            description="Trigger each supported SDK feature one action at a time"
            onPress={() => onNavigate('featureActions')}
            testID="featureActionsLink"
          />
          <MenuCard
            title="Feature Scenarios"
            description="Run complete RUM, resource, action, and operation scenarios"
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
            description="Start and stop views to test RUM lifecycle tracking"
            onPress={() => onNavigate('rumViews')}
            testID="rumViewsLink"
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 90,
    paddingBottom: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 92,
    marginRight: 28,
  },
  title: {
    color: colors.text,
    fontSize: 52,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 24,
    marginTop: 6,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 24,
    minWidth: 420,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoValue: {
    color: colors.text,
    fontSize: 19,
    marginTop: 2,
  },
  menuSection: {
    marginTop: 64,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 22,
  },
  menu: {
    flexGrow: 0,
  },
  menuContent: {
    paddingRight: 70,
  },
});
