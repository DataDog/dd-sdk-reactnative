import { Platform, StyleSheet } from "react-native";
import { Colors } from "../../common/styles";


export default StyleSheet.create({
    pickerButton: {
        padding: 10,
    },
    
    picker: {
        width: '40%',
        ...Platform.select({
            ios: {
                position: 'absolute',
                right: 0,
                zIndex: 1,
            },
        }),
        backgroundColor: Colors.White,
    },
    pickerLabel: {
        color: Colors.DarkGrey,
        fontSize: 15,
    },
});