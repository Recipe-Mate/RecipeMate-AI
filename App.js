import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, PermissionsAndroid, Platform, ScrollView } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

const App = () => {
  const [recognizedProducts, setRecognizedProducts] = useState([]);
  const [ocrResult, setOcrResult] = useState([]);  // OCR 결과를 저장할 상태

  // 상품명 추출 함수
  const extractProductNames = (text) => {
    const lines = text.split('\n'); // OCR 결과를 줄별로 나누기
    
    // 시작 포인트: "단가", "수량", "금액" 중 하나 이상 포함된 줄
    const productStartIndex = lines.findIndex(line => /(단가|수량|금액)/.test(line));
    if (productStartIndex === -1) return []; // 시작 포인트가 없는 경우 빈 배열 반환

    // 종료 포인트: "합계" 또는 "총구매액" 포함된 줄
    const productEndIndex = lines.findIndex((line, index) => index > productStartIndex && /(합계|총구매액)/.test(line));

    // 시작 포인트 이후 종료 포인트 이전의 줄에서 상품명 추출
    const productLines = lines.slice(productStartIndex + 1, productEndIndex === -1 ? undefined : productEndIndex).filter((line) => {
      // 상품명 조건: 한글과 숫자가 포함된 특정 패턴
      return /[가-힣]+/.test(line) && /\d/.test(line);
    });

    return productLines;
  };

  // 이미지에서 텍스트를 인식하는 함수
  const recognizeTextFromImage = async (imageUri) => {
    try {
      const result = await TextRecognition.recognize(
        imageUri,
        TextRecognitionScript.KOREAN // 한국어 인식
      );
      if (result && result.text) {
        const products = extractProductNames(result.text);
        setRecognizedProducts(products);  // 상품명 배열
        setOcrResult(result.text.split('\n'));  // OCR 결과를 줄별로 배열에 저장
      } else {
        console.error('Text recognition returned empty result');
      }
    } catch (error) {
      console.error('Text recognition failed:', error);
    }
  };

  // 카메라 권한 요청 함수
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
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // 카메라 열기 함수
  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      launchCamera({ mediaType: 'photo', saveToPhotos: true }, (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorCode) {
          console.error('Camera error:', response.errorCode);
        } else if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;
          recognizeTextFromImage(imageUri);
        }
      });
    }
  };

  // 갤러리에서 이미지 선택 함수
  const chooseImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image selection');
      } else if (response.errorCode) {
        console.error('Image library error:', response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        recognizeTextFromImage(imageUri);
      }
    });
  };

  // 카메라 또는 갤러리 선택 다이얼로그 함수
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Button title="Choose Image" onPress={showOptionDialog} />
      <ScrollView style={{ marginTop: 20, width: '100%' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>OCR Result:</Text>
        {ocrResult.length > 0 ? (
          ocrResult.map((line, index) => (
            <Text key={index} style={{ marginBottom: 10, fontSize: 14, color: '#333' }}>
              {line}
            </Text>
          ))
        ) : (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>No OCR result yet.</Text>
        )}

        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20 }}>Recognized Products:</Text>
        {recognizedProducts.length > 0 ? (
          recognizedProducts.map((product, index) => (
            <Text key={index} style={{ marginBottom: 10, fontSize: 16, color: 'green' }}>
              {product}
            </Text>
          ))
        ) : (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>No products recognized yet.</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default App;
