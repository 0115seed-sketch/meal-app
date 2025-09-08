const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // path 모듈 추가

const app = express();
// Render가 지정하는 포트 또는 로컬 개발용 3000번 포트 사용
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// --- 프론트엔드 파일 제공 설정 (추가) ---
// backend 폴더 기준으로 frontend 폴더의 경로를 설정합니다.
const frontendPath = path.join(__dirname, '..', 'frontend'); 
// 해당 경로의 파일들을 static 파일로 제공합니다.
app.use(express.static(frontendPath)); 
// ------------------------------------

// 나이스 API 키 (실제로는 환경 변수 등을 사용해야 합니다)
const API_KEY = "d588319109a74b2582fbb11f748c3e80";
const BASE_URL = "https://open.neis.go.kr/hub";

// 학교 정보 검색 API
app.get('/api/searchSchool', async (req, res) => {
    const { schoolName } = req.query;
    if (!schoolName) {
        return res.status(400).json({ error: "학교 이름을 입력해주세요." });
    }
    try {
        const response = await axios.get(`${BASE_URL}/schoolInfo`, {
            params: {
                KEY: API_KEY,
                Type: 'json',
                pIndex: 1,
                pSize: 10,
                SCHUL_NM: schoolName
            }
        });

        if (response.data.schoolInfo) {
            res.json(response.data.schoolInfo[1].row);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("학교 정보 API 오류:", error.message);
        res.status(500).json({ error: "서버에서 학교 정보를 가져오는 데 실패했습니다." });
    }
});

// 급식 식단 정보 API
app.get('/api/getMeal', async (req, res) => {
    const { schoolCode, officeCode, year, month } = req.query;
    if (!schoolCode || !officeCode || !year || !month) {
        return res.status(400).json({ error: "필수 파라미터가 누락되었습니다." });
    }

    const MLSV_FROM_YMD = `${year}${month}01`;
    const MLSV_TO_YMD = `${year}${month}${new Date(year, month, 0).getDate()}`;

    try {
        const response = await axios.get(`${BASE_URL}/mealServiceDietInfo`, {
            params: {
                KEY: API_KEY,
                Type: 'json',
                pIndex: 1,
                pSize: 100,
                ATPT_OFCDC_SC_CODE: officeCode,
                SD_SCHUL_CODE: schoolCode,
                // MMEAL_SC_CODE: '2', // 중식 코드를 추가합니다. 필요에 따라 조식(1), 석식(3) 등으로 변경 가능
                MLSV_FROM_YMD: MLSV_FROM_YMD,
                MLSV_TO_YMD: MLSV_TO_YMD
            }
        });

        if (response.data.mealServiceDietInfo) {
            res.json(response.data.mealServiceDietInfo[1].row);
        } else {
            // API 응답에 mealServiceDietInfo 필드가 없는 경우 (예: 정보 없음)
            res.json([]);
        }
    } catch (error) {
        console.error("급식 정보 API 오류:", error.message);
        // API 호출 자체에서 에러가 발생한 경우
        if (error.response) {
            // 나이스 API가 에러 코드를 보낸 경우 (예: KEY 만료)
            console.error("API 응답 데이터:", error.response.data);
            res.status(500).json({ error: "나이스 API 서버에서 오류가 발생했습니다.", details: error.response.data });
        } else {
            res.status(500).json({ error: "서버에서 급식 정보를 가져오는 데 실패했습니다." });
        }
    }
});

// --- 모든 경로 요청을 프론트엔드 index.html로 연결 (추가) ---
// API 경로가 아닌 모든 GET 요청은 index.html을 보내줍니다.
// 이는 페이지 새로고침 시 404 오류를 방지합니다.
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});
// ----------------------------------------------------

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
