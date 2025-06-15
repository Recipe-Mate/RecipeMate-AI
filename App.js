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

const excludedBrands = [
  '해태제과','오리온','크라운제과','농심','롯데제과','삼양식품','빙그레','포카칩','롯데푸드',
  '오뚜기','팔도','CJ제일제당','해찬들','대상','청정원','샘표식품','풀무원','양반','동원F&B',
  '사조대림','백설','샘표','이금기','해표','비비고','롯데칠성음료','광동제약','웅진식품',
  '동아오츠카','해태htb','코카콜라음료','델몬트','남양유업','매일유업','서울우유','푸르밀',
  '종가집','동원','롯데','해태','동원','국산'
].map((brand) => brand.toLowerCase());

const App = () => {
  const [imageUri, setImageUri] = useState(null);
  const [groupedLines, setGroupedLines] = useState([]);
  const [normalizedLines, setNormalizedLines] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
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
    let raw = name.trim();

    if (/^[0-9]+\s*$/.test(raw)) {
      if (raw.trim().length === 1) {
        return raw.trim();
      } else {
        return '';
      }
    }

    let processed = raw;
    
    processed = processed.replace(/^[0-9]+\s*[a-zA-Z]/, ''); // 숫자 + 영문 조합으로 시작하는 경우 제거
    processed = processed.replace(/^[0-9]+\s*/, ''); // 숫자 + 공백 조합으로 시작하는 경우 제거
    processed = processed.replace(/[^가-힣0-9a-zA-Z\/\s]/g, ''); // 한글, 숫자, 영문, 슬래시(/), 공백 외의 모든 문자 제거

    const slashIndex = processed.indexOf('/');
    if (slashIndex !== -1) {
      processed = processed.substring(0, slashIndex);
    }

    // 한글+숫자, 한글+영문, 영문+한글 사이에 공백 삽입
    processed = processed
      .replace(/([가-힣])([a-zA-Z0-9])/g, '$1 $2')
      .replace(/([a-zA-Z])([가-힣])/g, '$1 $2');
    processed = processed.replace(/\s+/g, ' ').trim().toLowerCase();

    // 브랜드명이 포함되면 제거
    excludedBrands.forEach((brand) => {
      processed = processed.replace(new RegExp(brand, 'gi'), '').trim();
    });

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
          
          !/\d{10,}/.test(line.text) && // 10자리 이상 숫자 (전화번호, 바코드 등) 제거
          !/\d{1,3}[,.][^\s]{3}(?![^\s])/.test(line.text) // 소수점이나 쉼표 포함된 가격 형식 제거
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

        // 수량으로 사용할 텍스트 필터링
        const normalized = lines.filter((line) =>
          /^\s*0{0,2}\d{1,2}P?\b/.test(line.text) && !line.text.includes(',')
        );
        setGroupedLines(grouped);
        setNormalizedLines(normalized);

        const items = normalized.map((line) => line.text);
        let processed = items.map((item) => preprocessName(item)).filter(Boolean);

        const names = [];
        const counts = [];

        processed.forEach((text) => {
          if (/^\d/.test(text)) {
            counts.push(text);
          } else {
            names.push(text);
          }
        });

        const jsonResult = [];
        for (let i = 0; i < names.length; i++) {
          let name = names[i];
          let weight = '0';
          let unit = 'EA';
          let count = counts[i] ?? '1';

          const match = name.match(/(\d+(?:\.\d+)?)(kg|g|ml|l)/i);
          if (match) {
            weight = match[1];
            unit = match[2].toLowerCase();
            name = name.substring(0, match.index);
          } else {
            const numberIndex = name.search(/[0-9]/);
            if (numberIndex !== -1) {
              name = name.substring(0, numberIndex);
            }
          }

          jsonResult.push({
            name: name.trim(),
            weight,
            unit,
            count,
          });
        }

        setFilteredItems([...names, ...counts]);
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
    setFilteredItems([]);
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

          <Text style={styles.sectionTitle}>정규화된 상품명 결과 (normalizedLines)</Text>
          {normalizedLines.map((line, idx) => (
            <Text key={idx} style={{ marginLeft: 10 }}>🔹 {line.text}</Text>
          ))}

          <Text style={styles.sectionTitle}>1차 필터링 결과 (filteredItems)</Text>
          {filteredItems.map((text, idx) => (
            <Text key={idx} style={{ marginLeft: 10 }}>
              🔸 {text}
            </Text>
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
