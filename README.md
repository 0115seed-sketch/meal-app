# 우리 학교 급식 📍

전국 학교의 급식 정보를 조회할 수 있는 웹 애플리케이션입니다. 나이스(NEIS) API를 활용하여 실시간 급식 정보를 제공합니다.


## ✨ 주요 기능

### 🔍 학교 검색
- 전국 학교 검색 기능
- 자동완성 검색 결과 제공
- 내 학교 설정 및 저장

### 📅 급식 정보 조회
- **오늘 보기**: 당일 급식 메뉴 확인
- **주간 보기**: 일주일 급식 계획 확인  
- **월간 보기**: 달력 형태로 한 달 급식 일정 확인

### 📊 영양 정보
- 급식의 영양 성분 분석 (탄수화물, 단백질, 지방)
- Chart.js를 활용한 시각적 차트 제공
- 상세 영양 정보 모달

### 🚨 알레르기 정보
- 식단별 알레르기 유발 요소 표시
- 19가지 알레르기 정보 제공
- 알레르기 번호를 실제 성분명으로 변환

### 📱 반응형 디자인
- 모바일, 태블릿, 데스크톱 대응
- 터치 친화적 인터페이스
- 모바일에서 최적화된 달력 뷰

## 🛠 기술 스택

### Frontend
- **HTML5**: 웹 페이지 구조
- **CSS3**: 스타일링 및 반응형 디자인
- **Vanilla JavaScript**: 순수 자바스크립트로 구현
- **Chart.js**: 영양 정보 차트 시각화

### Backend  
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **Axios**: HTTP 클라이언트
- **CORS**: Cross-Origin Resource Sharing 처리

### External API
- **나이스(NEIS) 교육정보 개방 포털**: 학교 정보 및 급식 데이터 제공

## 📂 프로젝트 구조

```
meal-app/
├── backend/
│   ├── package.json          # 백엔드 의존성 관리
│   ├── server.js             # Express 서버 메인 파일
│   └── package-lock.json     # 의존성 잠금 파일
├── frontend/
│   ├── index.html            # 메인 HTML 파일
│   ├── app.js                # 프론트엔드 로직
│   └── styles.css            # 스타일시트
├── 학교기본정보_2025년8월31일기준.csv  # 학교 데이터 (참고용)
└── README.md                 # 프로젝트 문서
```

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 14.0 이상
- npm 또는 yarn

### 1. 저장소 클론
```bash
git clone https://github.com/0115seed-sketch/meal-app.git
cd meal-app
```

### 2. 백엔드 의존성 설치
```bash
cd backend
npm install
```

### 3. 서버 실행
```bash
npm start
```

### 4. 브라우저에서 접속
```
http://localhost:3000
```

## 🔧 API 엔드포인트

### 학교 검색
```
GET /api/searchSchool?schoolName={학교명}
```
- **매개변수**: `schoolName` - 검색할 학교 이름
- **응답**: 학교 정보 배열

### 급식 정보 조회
```
GET /api/getMeal?schoolCode={학교코드}&officeCode={교육청코드}&year={연도}&month={월}
```
- **매개변수**: 
  - `schoolCode` - 학교 고유 코드
  - `officeCode` - 교육청 코드
  - `year` - 조회 연도 (YYYY)
  - `month` - 조회 월 (MM)
- **응답**: 급식 정보 배열

## 🎯 사용법

### 1. 학교 설정
1. 상단 검색창에 학교 이름 입력
2. 검색 결과에서 원하는 학교 선택
3. "내 학교로 설정" 버튼 클릭

### 2. 급식 정보 확인
1. 상단 우측의 보기 모드 선택 (오늘/주간/월간)
2. 월간 보기에서는 달력의 날짜 클릭으로 상세 정보 확인
3. 모달창에서 영양 정보 및 알레르기 정보 확인

### 3. 영양 정보 보기
- 오늘 보기: 우측에 당일 영양 차트 표시
- 상세 모달: 특정 날짜 클릭 시 영양 성분 차트 제공

## 🔐 환경 설정

### 나이스 API 키 설정
`server.js` 파일의 API_KEY를 본인의 나이스 API 키로 변경해주세요.

```javascript
const API_KEY = "your_neis_api_key_here";
```

> 나이스 API 키는 [나이스 교육정보 개방 포털](https://open.neis.go.kr/)에서 발급받을 수 있습니다.

## 📱 브라우저 지원

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트 관련 문의나 버그 리포트는 [Issues](https://github.com/0115seed-sketch/meal-app/issues)를 통해 남겨주세요.

---

**Made with ❤️ by 0115seed-sketch**