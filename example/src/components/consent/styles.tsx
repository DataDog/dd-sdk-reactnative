import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    item: {
        backgroundColor: '#f9c2ff',
        padding: 10,
        marginVertical: 8,
        marginHorizontal: 16,
        alignItems: "center"
    },
    itemTitle: {
        fontSize: 18
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 10,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: 400
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: "bold"
      },
      centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
      },
      button: {
        alignItems: "center",
        backgroundColor: "#DDDDDD",
        padding: 10
      }
});
