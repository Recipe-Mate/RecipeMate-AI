import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
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

  // 상품명 추출 함수
  const extractProductNames = (text) => {
    const lines = text.split('\n');
    const productStartIndex = lines.findIndex((line) => /(단가|수량|금액)/.test(line));
    if (productStartIndex === -1) return [];
    const productEndIndex = lines.findIndex(
      (line, index) => index > productStartIndex && /(합계|총구매액)/.test(line)
    );
    const productLines = lines
      .slice(productStartIndex + 1, productEndIndex === -1 ? undefined : productEndIndex)
      .filter((line) => /[가-힣]+/.test(line) && /\d/.test(line));
    return productLines;
  };

  // 이미지 선택 함수
  const chooseImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setImageUri(uri);
        setOcrResult([]);
        setRecognizedProducts([]);
        setStartCoords(null);
        setEndCoords(null);

        // 이미지의 실제 크기 가져오기
        Image.getSize(uri, (width, height) => {
          setImageSize({ width, height });
          console.log('Actual image size:', { width, height });
        });
      }
    });
  };

  // 선택된 영역에서 텍스트 인식
  const recognizeTextFromArea = async () => {
    if (!startCoords || !endCoords) {
      console.log('Error: Please select an area first.');
      return;
    }

    // 표시된 이미지 크기와 실제 이미지 크기 간의 비율 계산
    const displayedWidth = width; // 화면에 표시된 이미지의 가로 크기
    const displayedHeight = (width / imageSize.width) * imageSize.height; // 비율에 따른 세로 크기
    const scaleX = imageSize.width / displayedWidth;
    const scaleY = imageSize.height / displayedHeight;

    // 선택된 좌표를 실제 이미지 크기에 맞게 변환
    const realStartX = startCoords.x * scaleX;
    const realStartY = startCoords.y * scaleY;
    const realEndX = endCoords.x * scaleX;
    const realEndY = endCoords.y * scaleY;

    console.log('Displayed coordinates:', startCoords, endCoords);
    console.log('Converted coordinates:', {
      start: { x: realStartX, y: realStartY },
      end: { x: realEndX, y: realEndY },
    });

    try {
      const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.KOREAN);
      if (result && result.text) {
        const products = extractProductNames(result.text);
        setRecognizedProducts(products);
        setOcrResult(result.text.split('\n'));
      } else {
        console.error('Text recognition returned empty result');
      }
    } catch (error) {
      console.error('Text recognition failed:', error);
    }
  };

  const handleTouchStart = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setStartCoords({ x: locationX, y: locationY });
  };

  const handleTouchMove = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setEndCoords({ x: locationX, y: locationY });
  };

  const handleTouchEnd = () => {
    console.log('Selected area:', { start: startCoords, end: endCoords });
  };

  return (
    <View style={{ flex: 1 }}>
      <Button title="Choose Image" onPress={chooseImage} />
      {imageUri && (
        <View style={{ flex: 1, marginTop: 20 }}>
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
          <Button title="Recognize Text from Selected Area" onPress={recognizeTextFromArea} />
        </View>
      )}
      <ScrollView style={{ padding: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>OCR Result:</Text>
        {ocrResult.length > 0
          ? ocrResult.map((line, index) => (
              <Text key={index} style={{ marginBottom: 10 }}>
                {line}
              </Text>
            ))
          : <Text>No OCR result yet.</Text>}
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20 }}>Recognized Products:</Text>
        {recognizedProducts.length > 0
          ? recognizedProducts.map((product, index) => (
              <Text key={index} style={{ marginBottom: 10, color: 'green' }}>
                {product}
              </Text>
            ))
          : <Text>No products recognized yet.</Text>}
      </ScrollView>
    </View>
  );
};

export default App;
