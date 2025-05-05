import {
    SectionList as RNSectionList,
    Text,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

const DATA = [
  {
    title: 'Sporting Dogs',
    data: ['Labrador Retriever', 'Golden Retriever', 'Cocker Spaniel', 'Weimaraner'],
  },
  {
    title: 'Working Dogs',
    data: ['Rottweiler', 'Doberman Pinscher', 'Great Dane', 'Boxer'],
  },
  {
    title: 'Toy Breeds',
    data: ['Chihuahua', 'Pomeranian', 'Shih Tzu', 'Yorkshire Terrier'],
  },
  {
    title: 'Herding Dogs',
    data: ['Border Collie', 'Australian Shepherd', 'German Shepherd', 'Belgian Malinois'],
  },
  {
    title: 'Hound Dogs',
    data: ['Beagle', 'Basset Hound', 'Dachshund', 'Bloodhound'],
  },
];

function SectionList(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <RNSectionList
                style={styles.sessionReplaySectionList}
                sections={DATA}
                keyExtractor={(item, index) => item + index}
                renderItem={({item}) => (
                    <View style={styles.sessionReplaySectionListItem}>
                        <Text style={styles.sessionReplaySectionListItemTitle}>{item}</Text>
                    </View>
                )}
                renderSectionHeader={({section: {title}}) => (
                <Text style={styles.sessionReplaySectionListHeader}>{title}</Text>
                )}
            />
        </View>
    )                
};

export default SectionList;
