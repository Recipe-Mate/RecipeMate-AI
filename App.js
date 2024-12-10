import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { launchImageLibrary } from 'react-native-image-picker';

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

  return (
    <View>
      <Button title="Choose Image" onPress={chooseImage} />
      <Text style={{ marginTop: 20 }}>{recognizedText ? recognizedText : 'No text recognized'}</Text>
    </View>
  );
};

export default App;
