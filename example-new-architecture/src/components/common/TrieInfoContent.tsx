import React from 'react';
import {ScrollView, Text, StyleSheet} from 'react-native';

const TrieInfoContent: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Understanding the Trie Data Structure</Text>

      <Text style={styles.paragraph}>
        A Trie (pronounced "try") is a tree-like data structure that stores a
        dynamic set of strings. Each node represents a character of the string,
        and the edges represent the connections between characters. The root
        node is typically empty.
      </Text>

      <Text style={styles.subheader}>How Trie Works:</Text>
      <Text style={styles.paragraph}>
        1. <Text style={styles.bold}>Insertion:</Text> To insert a word, we
        start from the root and follow the path according to the characters of
        the word. If a character is missing, we create a new node. The last
        character marks the end of the word.
      </Text>
      <Text style={styles.paragraph}>
        2. <Text style={styles.bold}>Search:</Text> To search for a word, we
        traverse the nodes following the word's characters. If we reach a
        dead-end or a character is missing, the word doesn't exist in the Trie.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subheader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333',
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: 'black',
  },
});

export default TrieInfoContent;
