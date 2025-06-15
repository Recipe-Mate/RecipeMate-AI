
### 🍳 RecipeMate-AI

# 🔍 영수증 내 구매 식재료 데이터 인식 시스템 - AI OCR 모듈

## 📌 프로젝트 개요
영수증을 촬영하거나 업로드하여 식재료 정보를 자동으로 추출하고, 이를 JSON 형태로 가공해 냉장고 관리 및 레시피 추천에 활용할 수 있는 React Native 기반 OCR 모듈입니다.

## ⚙️ Develop Environment

<div align="center">
	<img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/></a>
</div>

- React Native 0.76+
- Android SDK (카메라 권한 필요)
- `react-native-ml-kit/text-recognition`
- `react-native-image-picker`

## 🚀 기술 스택
- `react-native-ml-kit/text-recognition` : ML Kit 기반 한글 OCR 인식 기능 제공  
- `react-native-image-picker` : 카메라 및 갤러리 접근을 통해 이미지 선택/촬영 가능  
- `PermissionsAndroid` : Android 13 이하 카메라 권한 요청  
- 정규표현식 기반 전처리 : 상품명 필터링 및 용량, 수량 추출  
- Y축 기반 정렬 : OCR 결과의 줄 위치를 기준으로 그룹핑 처리  
- JSON 포맷 변환 : 이름, 무게, 단위, 수량 등의 속성 추출 및 가공  

## ⚙️ 기능 흐름
1. 사용자 이미지 선택 or 카메라 촬영  
2. ML Kit으로 OCR 인식  
3. Y축 기준 줄 그룹핑 → 의미 있는 줄 추출  
4. 상품명 정제 (제조사 제거, 특수문자 제거, 영문/숫자 분리 등)  
5. 수량 및 단위 추출 (EA/g/kg/ml 등)  
6. 최종 결과를 JSON 형태로 구성하여 출력  

## 💡 설치 및 사용
```bash
npm install @react-native-ml-kit/text-recognition
npm install react-native-image-picker
```

## 🧪 예시 코드

#### 1. 이미지 선택 및 OCR 실행

```ts
const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
```

* ML Kit의 `TextRecognition.recognize` 메서드를 사용하여 이미지에서 텍스트 추출
* 텍스트 블록에서 line 단위로 분리, 각 line은 `text`, `bounding.top` 값 포함

#### 2. 불필요한 텍스트 필터링

```ts
.filter((line) =>
  !/\d{10,}/.test(line.text) &&
  !/\d{1,3}[,.][^\s]{3}(?![^\s])/.test(line.text)
);
```

* 전화번호, 가격 등 숫자 필터링
* Y좌표 기준으로 줄 단위 그룹화

#### 3. 상품명 후보 정규화

```ts
const normalized = lines.filter((line) => /^\s*0{0,2}\d{1,2}P?\b/.test(line.text));
```

* 계산 순번 등으로 시작하는 텍스트만 선택
* 상품명과 수량 매칭을 위한 기본 필터링

#### 4. 텍스트 전처리 함수 `preprocessName()`

```ts
const cleaned = preprocessName(rawText);
```

* 숫자만 있는 항목 제거
* 특수문자 제거, 브랜드명 제거 (`excludedBrands`)
* `슬래시(/)` 뒤 제거하여 상품명 순수화
* 예: `"동원참치/150g"` → `"참치"` 로 정제됨

#### 5. 상품명·수량·단위 추출

```ts
const match = name.match(/(\d+(?:\.\d+)?)(kg|g|ml|l)/i);
```

* 이름에서 `g`, `kg`, `ml`, `l` 등 단위 인식
* 해당 수치는 weight로 분리
* 나머지 숫자는 count로 처리하며, 없을 경우 기본 1 설정

---

### 6. 최종 출력 예시

```json
{
  "name": "두부",
  "weight": "300",
  "unit": "g",
  "count": "2"
}
```

* 이름: 정제된 상품명
* 무게: 이름 안에 포함된 수치 기반
* 단위: g, kg, ml 등 추출
* 수량: 별도 존재하는 숫자 또는 기본값 `1`

## 핵심 라이브러리, 파일

---

### [**@react-native-ml-kit/text-recognition**](https://www.npmjs.com/package/@react-native-ml-kit/text-recognition)
- ML Kit 기반의 텍스트 인식 라이브러리입니다. 영수증 이미지에서 텍스트를 추출하는 데 사용했습니다.

---

### [**react-native-image-picker**](https://www.npmjs.com/package/react-native-image-picker)
- 카메라 촬영 또는 갤러리에서 이미지를 선택할 수 있도록 해주는 라이브러리입니다.  
- `launchCamera`, `launchImageLibrary` 메서드를 사용하여 사용자의 입력을 받아 OCR에 활용할 이미지를 제공합니다.  
- Android에서는 `PermissionsAndroid`를 통해 카메라 권한 요청이 필요합니다.

---