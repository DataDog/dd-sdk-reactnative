import { useState, useCallback } from 'react';
import {
    View,
    Button,
    NativeSyntheticEvent,
    TextInput,
    Pressable
} from 'react-native';

function GestureButton({ singleHandler, multiHandler }: Props) {
    const singleTap = Gesture.Tap()
        .maxDuration(250)
        .onStart(() => {
            'worklet';
            runOnJS(singleHandler);
        });

    const doubleTap = Gesture.Tap()
        .maxDuration(250)
        .numberOfTaps(2)
        .onStart(() => {
            'worklet';
            runOnJS(multiHandler);
        });

    return (
        <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
            <View style={[styles.box, { backgroundColor: 'blue' }]} />
        </GestureDetector>
    );
}

function MyComponent() {
    const [a, setA] = useState(0);
    const [b, setB] = useState(0);

    const func = (event: NativeSyntheticEvent) => {
        console.log('Testing: ', event);
    };

    const func2 = useCallback(() => {
        console.log('Testing2 ', a, b);
        setA(x => x + 1);
        setB(x => x + 1);
    }, [a, b]);

    const func3 = React.useCallback(() => {
        console.log('Testing2 ', a, b);
        setA(x => x + 1);
        setB(x => x + 1);
    }, [a, b]);

    return (
        <View>
            <GestureButton
                singleHandler={() => console.log('single TAP')}
                multiHandler={() => console.log('multi TAP')}
            />

            <Tab
                value={index}
                onChange={e => setIndex(e)}
                indicatorStyle={{
                    backgroundColor: 'white',
                    height: 3
                }}
                variant="primary"
            >
                <Tab.Item
                    dd-action-name="RecentAccessibilityL1"
                    title="Recent"
                    titleStyle={{ fontSize: 12 }}
                    icon={{ name: 'timer', type: 'ionicon', color: 'white' }}
                />
                <Tab.Item
                    dd-action-name="RecentAccessibilityL2"
                    title="favorite"
                    titleStyle={{ fontSize: 12 }}
                    icon={{ name: 'heart', type: 'ionicon', color: 'white' }}
                />
                <Tab.Item
                    dd-action-name="RecentAccessibilityL3"
                    title="cart"
                    titleStyle={{ fontSize: 12 }}
                    icon={{ name: 'cart', type: 'ionicon', color: 'white' }}
                />
            </Tab>
            <TabView value={index} onChange={setIndex} animationType="spring">
                <TabView.Item
                    style={{
                        backgroundColor: 'red',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <Text>Recent</Text>
                </TabView.Item>
                <TabView.Item
                    style={{
                        backgroundColor: 'blue',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <Text>Favorite</Text>
                </TabView.Item>
                <TabView.Item
                    style={{
                        backgroundColor: 'green',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <Text>Cart</Text>
                </TabView.Item>
            </TabView>
        </View>
    );
}
