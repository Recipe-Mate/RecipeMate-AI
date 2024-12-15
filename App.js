import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image, Dimensions, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import Svg, { Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

const App = () => {
  const [imageUri, setImageUri] = useState(null);
  const [ocrResult, setOcrResult] = useState([]);
  const [recognizedProducts, setRecognizedProducts] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // 권한 요청
  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'This app requires camera access to scan receipts.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Camera permission denied');
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };
    requestCameraPermission();
  }, []);

  // 상품명 추출 함수
  const extractProductNames = (text) => {
    const lines = text.split('\n');
    const productStartIndex = lines.findIndex((line) => /(단가|수량|금액)/.test(line));
    if (productStartIndex === -1) return [];
    const productEndIndex = lines.findIndex((line, index) => index > productStartIndex && /(합계|총구매액)/.test(line));
    const productLines = lines
      .slice(productStartIndex + 1, productEndIndex === -1 ? undefined : productEndIndex)
      .filter((line) => /[가-힣]+/.test(line) && /\d/.test(line));
    return productLines.map((product, index) => ({ id: index + 1, name: product }));
  };

  // 영수증 스캔하기
  const scanReceipt = () => {
    launchCamera({ mediaType: 'photo' }, handleImageResponse);
  };

  // 사진 업로드하기
  const uploadPhoto = () => {
    launchImageLibrary({ mediaType: 'photo' }, handleImageResponse);
  };

  // 이미지 처리 함수
  const handleImageResponse = (response) => {
    if (response.assets && response.assets.length > 0) {
      const uri = response.assets[0].uri;
      setImageUri(uri);
      setOcrResult([]);
      setRecognizedProducts([]);
      setStartCoords(null);
      setEndCoords(null);
      
      Image.getSize(uri, (width, height) => setImageSize({ width, height }));
    }
  };

  // 텍스트 인식
  const recognizeTextFromArea = async () => {
    if (!startCoords || !endCoords) return;

    const displayedHeight = (width / imageSize.width) * imageSize.height;
    const scaleX = imageSize.width / width;
    const scaleY = imageSize.height / displayedHeight;

    const realStartX = startCoords.x * scaleX;
    const realStartY = startCoords.y * scaleY;
    const realEndX = endCoords.x * scaleX;
    const realEndY = endCoords.y * scaleY;

    try {
      const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.KOREAN);
      if (result?.text) {
        const products = extractProductNames(result.text);
        setRecognizedProducts(products);
        setOcrResult(result.text.split('\n'));
      }
    } catch (error) {
      console.error('OCR Error:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {!imageUri ? (
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>영수증 분석하기</Text>
          <View style={{ flexDirection: 'column', justifyContent: 'space-around', marginVertical: 10 }}>
            <Button title="영수증 스캔하기" onPress={scanReceipt} />
            <View style={{ marginVertical: 10 }} />
            <Button title="사진 업로드하기" onPress={uploadPhoto} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{ marginTop: 10 }}
            onTouchStart={(e) => setStartCoords({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })}
            onTouchMove={(e) => setEndCoords({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })}
            onTouchEnd={() => console.log('Selected:', startCoords, endCoords)}
          >
            <Image source={{ uri: imageUri }} style={{ width: width, height: 300, resizeMode: 'contain' }} />
            {startCoords && endCoords && (
              <Svg style={StyleSheet.absoluteFill}>
                <Rect
                  x={Math.min(startCoords.x, endCoords.x)}
                  y={Math.min(startCoords.y, endCoords.y)}
                  width={Math.abs(endCoords.x - startCoords.x)}
                  height={Math.abs(endCoords.y - startCoords.y)}
                  stroke="blue"
                  strokeWidth="2"
                  fill="rgba(0, 0, 255, 0.3)"
                />
              </Svg>
            )}
          </View>
          <Button title="촬영 완료" onPress={recognizeTextFromArea} />
          <ScrollView style={{ marginTop: 10, width: '100%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>추출된 상품명:</Text>
            {recognizedProducts.map((product) => (
              <Text key={product.id} style={{ color: 'green', marginLeft: 10 }}>
                {`ID: ${product.id}, Name: ${product.name}`}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default App;
