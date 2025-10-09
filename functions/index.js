const functions = require('firebase-functions');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 나이스 API 키 (실제로는 환경 변수 등을 사용해야 합니다)
const API_KEY = "d588319109a74b2582fbb11f748c3e80";
const BASE_URL = "https://open.neis.go.kr/hub";

// 캐싱을 위한 객체 및 설정
const cache = {
    districtAverage: {},  // 교육청별 영양 평균 캐시
    cacheDuration: 7 * 24 * 60 * 60 * 1000,  // 캐시 유효 기간 (7일)
    
    // 캐시 키 생성 함수
    createKey: (officeCode, date) => `${officeCode}_${date}`,
    
    // 캐시에서 데이터 가져오기
    get: function(officeCode, date) {
        const key = this.createKey(officeCode, date);
        const cachedData = this.districtAverage[key];
        
        if (cachedData && (Date.now() - cachedData.timestamp < this.cacheDuration)) {
            console.log(`캐시에서 데이터 가져옴: ${key}`);
            return cachedData.data;
        }
        
        return null;
    },
    
    // 캐시에 데이터 저장
    set: function(officeCode, date, data) {
        const key = this.createKey(officeCode, date);
        this.districtAverage[key] = {
            data: data,
            timestamp: Date.now()
        };
        console.log(`캐시에 데이터 저장: ${key}`);
    },
    
    // 캐시 정리 (오래된 항목 제거)
    cleanup: function() {
        const now = Date.now();
        Object.keys(this.districtAverage).forEach(key => {
            if (now - this.districtAverage[key].timestamp > this.cacheDuration) {
                delete this.districtAverage[key];
                console.log(`캐시 항목 만료 삭제: ${key}`);
            }
        });
    }
};

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
                MLSV_FROM_YMD: MLSV_FROM_YMD,
                MLSV_TO_YMD: MLSV_TO_YMD
            }
        });

        if (response.data.mealServiceDietInfo) {
            res.json(response.data.mealServiceDietInfo[1].row);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("급식 정보 API 오류:", error.message);
        if (error.response) {
            console.error("API 응답 데이터:", error.response.data);
            res.status(500).json({ error: "나이스 API 서버에서 오류가 발생했습니다.", details: error.response.data });
        } else {
            res.status(500).json({ error: "서버에서 급식 정보를 가져오는 데 실패했습니다." });
        }
    }
});

// 교육청 평균 영양 정보 API
app.get('/api/getDistrictAverage', async (req, res) => {
    const { officeCode, date } = req.query;
    if (!officeCode || !date) {
        return res.status(400).json({ error: "필수 파라미터가 누락되었습니다." });
    }

    // 캐시에서 데이터 확인
    const cachedResult = cache.get(officeCode, date);
    if (cachedResult) {
        return res.json(cachedResult);
    }

    try {
        // 해당 교육청의 모든 학교 목록 가져오기 (페이징 처리)
        let schools = [];
        let currentPage = 1;
        let hasMorePages = true;
        const maxPages = 10; // 최대 10페이지까지만 조회
        
        while (hasMorePages && currentPage <= maxPages) {
            const schoolListResponse = await axios.get(`${BASE_URL}/schoolInfo`, {
                params: {
                    KEY: API_KEY,
                    Type: 'json',
                    pIndex: currentPage,
                    pSize: 100,
                    ATPT_OFCDC_SC_CODE: officeCode
                }
            }).catch(err => {
                console.error(`학교 목록 페이지 ${currentPage} 가져오기 실패:`, err.message);
                return { data: null };
            });
            
            if (!schoolListResponse.data || !schoolListResponse.data.schoolInfo) {
                hasMorePages = false;
                continue;
            }
            
            const pageSchools = schoolListResponse.data.schoolInfo[1].row || [];
            schools = [...schools, ...pageSchools];
            
            if (pageSchools.length < 100) {
                hasMorePages = false;
            } else {
                currentPage++;
            }
        }
        
        if (schools.length === 0) {
            return res.json({ error: "교육청 내 학교 정보를 가져올 수 없습니다." });
        }
        
        console.log(`교육청 코드 ${officeCode}에서 총 ${schools.length}개 학교 정보를 가져왔습니다.`);
        
        // 학교 목록에서 무작위로 100개 선택
        const sampleSize = Math.min(100, schools.length);
        const randomSchools = [];
        
        // 피셔-예이츠 셔플 알고리즘으로 무작위 선택
        const tempSchools = [...schools];
        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * tempSchools.length);
            randomSchools.push(tempSchools[randomIndex]);
            tempSchools.splice(randomIndex, 1);
        }
        
        console.log(`${sampleSize}개 학교를 무작위로 선택했습니다.`);
        
        // 각 학교별로 급식 데이터 가져오기
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);

        // 모든 학교의 급식 데이터를 가져오는 Promise 배열 생성
        const mealPromises = randomSchools.map(school => 
            axios.get(`${BASE_URL}/mealServiceDietInfo`, {
                params: {
                    KEY: API_KEY,
                    Type: 'json',
                    pIndex: 1,
                    pSize: 10,
                    ATPT_OFCDC_SC_CODE: officeCode,
                    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
                    MLSV_YMD: date
                }
            }).catch(err => {
                console.log(`학교 ${school.SCHUL_NM} 급식 정보 가져오기 실패: ${err.message}`);
                return { data: null };
            })
        );

        // 모든 Promise 처리
        const mealResponses = await Promise.all(mealPromises);
        
        // 영양소 합계 초기화
        let totalCarb = 0, totalProt = 0, totalFat = 0;
        let schoolCount = 0;
        
        // 각 학교의 급식 데이터에서 영양소 정보 추출 및 합산
        mealResponses.forEach(response => {
            if (response.data && response.data.mealServiceDietInfo) {
                const meals = response.data.mealServiceDietInfo[1].row;
                meals.forEach(meal => {
                    const ntrInfo = meal.NTR_INFO || '';
                    const carbMatch = ntrInfo.match(/탄수화물\(g\)\s*:\s*([\d.]+)/);
                    const protMatch = ntrInfo.match(/단백질\(g\)\s*:\s*([\d.]+)/);
                    const fatMatch = ntrInfo.match(/지방\(g\)\s*:\s*([\d.]+)/);
                    
                    if (carbMatch && protMatch && fatMatch) {
                        totalCarb += parseFloat(carbMatch[1]);
                        totalProt += parseFloat(protMatch[1]);
                        totalFat += parseFloat(fatMatch[1]);
                        schoolCount++;
                    }
                });
            }
        });
        
        // 평균 계산
        const result = {
            date,
            totalSchoolCount: schools.length,
            sampleSize: schoolCount,
            sampledSchools: randomSchools.map(school => ({
                code: school.SD_SCHUL_CODE,
                name: school.SCHUL_NM
            })),
            averageNutrition: {
                carb: schoolCount > 0 ? totalCarb / schoolCount : 0,
                prot: schoolCount > 0 ? totalProt / schoolCount : 0,
                fat: schoolCount > 0 ? totalFat / schoolCount : 0
            },
            cached: false,
            cachedAt: null
        };
        
        // 결과를 캐시에 저장
        cache.set(officeCode, date, { ...result, cached: true, cachedAt: new Date().toISOString() });
        
        res.json(result);
    } catch (error) {
        console.error("교육청 평균 정보 API 오류:", error.message);
        res.status(500).json({ error: "서버에서 교육청 평균 정보를 가져오는 데 실패했습니다." });
    }
});

// Firebase Functions로 Express 앱 배포
exports.api = functions.https.onRequest(app);
