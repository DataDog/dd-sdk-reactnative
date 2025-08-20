import { useState, useCallback } from 'react';
import {
    View,
    Button,
    NativeSyntheticEvent,
    TextInput,
    Pressable,
    TouchableOpacity
} from 'react-native';

function MyComponent() {
    return (
        <View>
            <Tab
                value={index}
                onChange={(e, a) => setIndex(e)}
                indicatorStyle={styles.tabIndicator}
                variant="primary"
            >
                <Tab.Item
                    title="Recent"
                    titleStyle={styles.tabTitle}
                    accessibilityLabel="Recent"
                />
                <Tab.Item
                    title="favorite"
                    titleStyle={styles.tabTitle}
                    accessibilityLabel="Favorite"
                />
                <Tab.Item
                    title="cart"
                    titleStyle={styles.tabTitle}
                    accessibilityLabel="Cart"
                />
            </Tab>
        </View>
    );
}
