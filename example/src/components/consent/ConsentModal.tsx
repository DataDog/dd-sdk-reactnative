import { TrackingConsent } from "@datadog/mobile-react-native";
import React, { Component } from "react";
import { Modal, View, FlatList, Pressable, Text } from "react-native";
import ConsentItem from './ConsentItem';
import styles from "./styles";

interface ConsentModalProps {
    onClose: (selectedConsent: TrackingConsent) => void
    visible: boolean
}

interface ConsentModalState {
    currentConsent: TrackingConsent
}

export default class ConsentModal extends Component<ConsentModalProps, ConsentModalState>{

    setConsent(consent: TrackingConsent) {
        this.setState({ currentConsent: consent })
    }

    renderTrackingConsentItem({ item }) {
        const isSelected = TrackingConsent[item] === this.state.currentConsent
        const backgroundColor = isSelected ? "#303f9f" : "#448aff";
        const color = isSelected ? 'white' : 'black';

        return (
            <ConsentItem
                item={item}
                onPress={() => {
                    const consent = TrackingConsent[item]
                    this.setState({ currentConsent: consent })
                }}
                backgroundColor={{ backgroundColor }}
                textColor={{ color }}
            />
        );
    }

    render() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={this.props.visible}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Tracking Consent</Text>
                        <FlatList
                            style={{ marginTop: 20 }}
                            data={Object.keys(TrackingConsent)}
                            renderItem={this.renderTrackingConsentItem.bind(this)}
                            keyExtractor={item => item}
                        />
                        <Pressable
                            style={styles.button}
                            onPress={() => {
                                const consent = this.state.currentConsent
                                this.props.onClose(consent)
                            }}>
                            <Text>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        )
    }

}
