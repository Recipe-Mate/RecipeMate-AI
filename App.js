import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import Svg, { Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

const App = () => {
  const [imageUri, setImageUri] = useState(null);
  const [groupedLines, setGroupedLines] = useState([]);
  const [normalizedLines, setNormalizedLines] = useState([]);
  const [jsonData, setJsonData] = useState([]);
  const [boundingRects, setBoundingRects] = useState([]);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

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

  const preprocessName = (name) => {
    // 1. 앞쪽 숫자 제거
    let processed = name.replace(/^\d+\s*/, '');
    // 2. 공백 제거
    processed = processed.replace(/\s+/g, '');
    // 3. 한글 + 숫자 사이에 공백 삽입
    processed = processed.replace(/([가-힣])(\d)/g, '$1 $2');
    // 4. 영문 소문자로
    processed = processed.replace(/[A-Z]/g, (c) => c.toLowerCase());

    return processed;
  };

  const processImage = async (uri) => {
    setImageUri(uri);
    Image.getSize(uri, (w, h) => setOriginalSize({ width: w, height: h }));

    try {
      const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
      if (result?.blocks) {
        const lines = result.blocks.flatMap((block) =>
          block.lines.map((line) => ({
            text: line.text,
            y: line.bounding?.top ?? 0,
            bounding: line.bounding,
          }))
        ).filter((line) =>
          !/\d{10,}/.test(line.text) &&
          !/\d{1,3}[,.][^\s]{3}(?![^\s])/.test(line.text)
        );

        const grouped = [];
        lines.sort((a, b) => a.y - b.y);
        lines.forEach((line) => {
          const lastGroup = grouped[grouped.length - 1];
          if (!lastGroup || Math.abs(lastGroup[0].y - line.y) > 10) {
            grouped.push([line]);
          } else {
            lastGroup.push(line);
          }
        });

        const normalized = lines.filter((line) => /^\s*0{0,2}\d{1,2}P?\b/.test(line.text));
        setGroupedLines(grouped);
        setNormalizedLines(normalized);
        setBoundingRects(lines.map((l) => l.bounding).filter(Boolean));
        
        const items = normalized.map((line) => line.text);
        const cleanedItems = items.map((item) => preprocessName(item));

        const jsonResult = [];
        if (cleanedItems.length % 2 === 0) {
          const half = cleanedItems.length / 2;
          for (let i = 0; i < half; i++) {
            jsonResult.push({ name: cleanedItems[i], count: items[i + half] });
          }
        } else {
          cleanedItems.forEach((item) => {
            if (/[가-힣]{2,}/.test(item)) {
              jsonResult.push({ name: item, count: '1' });
            }
          });
        }
        setJsonData(jsonResult);
      }
    } catch (e) {
      console.error('OCR 실패:', e);
    }
  };

  const sendToServer = async () => {
    try {
      const response = await fetch('http://172.30.1.44:8080/api/receipt/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });
      const resText = await response.text();
      console.log('서버 응답:', resText);
      alert('서버로 전송 성공!');
    } catch (error) {
      console.error('전송 실패:', error); 
      alert('서버로 전송 실패 😢');
    }
  };

  const chooseImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        processImage(response.assets[0].uri);
      }
    });
  };

  const takePhoto = () => {
    launchCamera({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        processImage(response.assets[0].uri);
      }
    });
  };

  const reset = () => {
    setImageUri(null);
    setGroupedLines([]);
    setNormalizedLines([]);
    setJsonData([]);
    setBoundingRects([]);
    setDisplayedSize({ width: 0, height: 0 });
    setOriginalSize({ width: 0, height: 0 });
  };

  const scaleX = originalSize.width ? displayedSize.width / originalSize.width : 1;
  const scaleY = originalSize.height ? displayedSize.height / originalSize.height : 1;

  return (
    <View style={{ flex: 1 }}>
      {!imageUri ? (
        <View style={styles.centered}>
          <Button title="📷 카메라로 촬영하기" onPress={takePhoto} />
          <View style={{ marginVertical: 10 }} />
          <Button title="🖼 이미지 선택하기" onPress={chooseImage} />
        </View>
      ) : (
        <ScrollView style={{ padding: 10 }}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: width, height: 300, resizeMode: 'contain' }}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setDisplayedSize({ width, height });
              }}
            />
            <Svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 300 }}
            >
              {boundingRects.map((rect, idx) => (
                <Rect
                  key={idx}
                  x={rect.left * scaleX}
                  y={rect.top * scaleY}
                  width={rect.width * scaleX}
                  height={rect.height * scaleY}
                  stroke="red"
                  strokeWidth="1"
                  fill="rgba(255,0,0,0.1)"
                />
              ))}
            </Svg>
          </View>

          <Text style={styles.sectionTitle}>📄 OCR 결과 (Y좌표 기준 묶음)</Text>
          {groupedLines.map((group, idx) => (
            <Text key={idx} style={{ marginBottom: 8 }}>
              {group.map((line) => line.text).join('  |  ')}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>정규화된 상품명 결과</Text>
          {normalizedLines.map((line, idx) => (
            <Text key={idx} style={{ marginLeft: 10 }}>🔹 {line.text}</Text>
          ))}

          <Text style={styles.sectionTitle}> JSON 파일</Text>
          {jsonData.map((item, idx) => (
            <Text key={idx} style={{ marginLeft: 10 }}>
              🔸 {item.name} - {item.count}
            </Text>
          ))}

          <Button title="서버로 전송" onPress={sendToServer} />

          <TouchableOpacity onPress={reset} style={{ marginTop: 20 }}>
            <Text style={{ color: 'blue', fontSize: 16 }}>⬅ 뒤로가기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
});

export default App;
