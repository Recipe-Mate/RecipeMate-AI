import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

const App = () => {
  const [recognizedText, setRecognizedText] = useState('');

  const recognizeTextFromImage = async (imageUri) => {
    try {
      const result = await TextRecognition.recognize(
        imageUri,
        TextRecognitionScript.KOREAN // 한국어 인식
      );
      setRecognizedText(result.text);
    } catch (error) {
      console.log('Text recognition failed:', error);
    }
  };

  const chooseImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        recognizeTextFromImage(imageUri);
      }
    });
  };

  const openCamera = () => {
    console.log('Camera button pressed!');
  };

  const showOptionDialog = () => {
    Alert.alert(
      'Choose Option',
      'Do you want to open the Camera or choose from the Gallery?',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: chooseImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Choose Image" onPress={showOptionDialog} />
      <Text style={{ marginTop: 20, paddingHorizontal: 20, textAlign: 'center' }}>
        {recognizedText ? recognizedText : 'No text recognized yet.'}
      </Text>
    </View>
  );
};

export default App;
