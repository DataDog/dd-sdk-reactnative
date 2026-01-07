import {
    Text,
    View,
} from 'react-native';
import React from 'react';

import { CommonStyles as styles } from '../../../common/styles';

function TextViews(): React.JSX.Element {
    return (
        <View style={styles.fullScreenHolder}>
            <Text style={styles.sessionReplayText}>Doggo shibe shoob shoober doggorino shooberino long doggo length boy pupperino fat boi snoot, very hand that feed shibe puggorino very jealous pupper boof pupper big ol pupper I am bekom fat much ruin diet very taste wow.</Text>
            <Text style={[styles.sessionReplayText, styles.sessionReplayTextCursive]}>Borkdrive doggo he made many woofs many pats tungg shibe you are doing me the shock heckin good boys shoob, h*ck wow such tempt porgo sub woofer floofs shoober doge borkf smol, blep dat tungg tho ur givin me a spook very taste wow most angery pupper I have ever seen length boy woofer.</Text>
            <Text style={[styles.sessionReplayText, styles.sessionReplayTextBold]}>Super chub big ol pupper floofs blep doggo pupper such treat shooberino, adorable doggo borkdrive he made many woofs heck long water shoob h*ck, wrinkler lotsa pats dat tungg tho fat boi much ruin diet most angery pupper I have ever seen.</Text>
            <Text style={[styles.sessionReplayText, styles.sessionReplayTextSpaced]}>Adorable doggo waggy wags maximum borkdrive smol long doggo mlem bork, fluffer ur givin me a spook doggorino puggorino.</Text>
            <View>
                <Text style={[styles.sessionReplayText]} ellipsizeMode='tail' numberOfLines={1}>Ellipsized doggo waggy wags maximum borkdrive smol long doggo mlem bork, fluffer ur givin me a spook doggorino puggorino, fluffer ur givin me a spook doggorino puggorino, fluffer ur givin me a spook doggorino puggorino.</Text>
                <Text style={[styles.sessionReplayText]} ellipsizeMode='tail' numberOfLines={2}>Ellipsized doggo waggy wags maximum borkdrive smol long doggo mlem bork, fluffer ur givin me a spook doggorino puggorino.</Text>
            </View>
        </View>
    )                
};

export default TextViews;
