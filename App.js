import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
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

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Camera permission granted');
          return true;
        } else {
          console.log('Camera permission denied');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      launchCamera({ mediaType: 'photo', saveToPhotos: true }, (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          console.log('Camera error:', response.errorCode);
        } else if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          recognizeTextFromImage(imageUri);
        }
      });
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
