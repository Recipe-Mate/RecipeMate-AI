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

const { width } = Dimensions.get('window');

const App = () => {
  const [imageUri, setImageUri] = useState(null);
  const [groupedLines, setGroupedLines] = useState([]);
  const [normalizedLines, setNormalizedLines] = useState([]);
  const [jsonData, setJsonData] = useState([]);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });

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
    let processed = name;
    processed = processed.replace(/^\d+\s*[a-zA-Z]/, ''); // 순번+알파벳 제거
    processed = processed.replace(/^\d+\s*/, ''); // 숫자만 제거
    processed = processed.replace(/[^가-힣0-9a-zA-Z\s]/g, ''); // 특수문자 제거
    processed = processed
      .replace(/([가-힣])([a-zA-Z0-9])/g, '$1 $2')
      .replace(/([a-zA-Z])([가-힣])/g, '$1 $2'); // 종류 다른 문자 공백 추가
    processed = processed.replace(/\s+/g, ' ').trim(); // 여러 공백 정리
    processed = processed.toLowerCase(); // 소문자화
    return processed;
  };

  const processImage = async (uri) => {
    setImageUri(uri);
    Image.getSize(uri, (w, h) => setDisplayedSize({ width: w, height: h }));

    try {
      const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
      if (result?.blocks) {
        const lines = result.blocks.flatMap((block) =>
          block.lines.map((line) => ({
            text: line.text,
            y: line.bounding?.top ?? 0,
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

        const items = normalized.map((line) => line.text);
        const cleanedItems = items.map((item) => preprocessName(item));

        const jsonResult = [];

        if (cleanedItems.length % 2 === 0) {
          const half = cleanedItems.length / 2;

          for (let i = 0; i < half; i++) {
            let name = cleanedItems[i];
            let weight = '0';
            let unit = '없음';

            const match = name.match(/(\d+(?:\.\d+)?)(kg|g|ml|l)/i);
            if (match) {
              weight = match[1]; // 숫자만
              unit = match[2].toLowerCase(); // 단위만
              name = name.substring(0, match.index); // 무게 나오기 전까지만 상품명
            } else {
              const numberIndex = name.search(/[0-9]/);
              if (numberIndex !== -1) {
                name = name.substring(0, numberIndex);
              }
            }

            jsonResult.push({
              name: name.trim(),
              weight: weight,
              unit: unit,
              count: items[i + half],
            });
          }
        } else {
          cleanedItems.forEach((item) => {
            if (/[가-힣]{2,}/.test(item)) {
              jsonResult.push({ name: item.trim(), weight: '0', unit: '없음', count: '1' });
            }
          });
        }

        setJsonData(jsonResult);
      }
    } catch (e) {
      console.error('OCR 실패:', e);
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
    setDisplayedSize({ width: 0, height: 0 });
  };

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
          <Image
            source={{ uri: imageUri }}
            style={{ width: width, height: 300, resizeMode: 'contain' }}
          />

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

          <Text style={styles.sectionTitle}>JSON 결과</Text>
          {jsonData.map((item, idx) => (
            <Text key={idx} style={{ marginLeft: 10 }}>
              🔸 {item.name} - {item.weight} - {item.unit} - {item.count}
            </Text>
          ))}

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
