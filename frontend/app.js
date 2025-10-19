document.addEventListener('DOMContentLoaded', () => {
    // --- 변수 선언 ---
    const schoolSearchInput = document.getElementById('school-search-input');
    const searchBtn = document.getElementById('search-btn');
    const schoolSearchResults = document.getElementById('school-search-results');
    const mySchoolName = document.getElementById('my-school-name');
    const setMySchoolBtn = document.getElementById('set-my-school-btn');
    const viewMySchoolBtn = document.getElementById('view-my-school-btn');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const currentMonthYear = document.getElementById('current-month-year');
    const calendarGrid = document.getElementById('calendar-grid');

    // 보기 모드 버튼 및 컨테이너
    const todayViewBtn = document.getElementById('today-view-btn');
    const weeklyViewBtn = document.getElementById('weekly-view-btn');
    const monthlyViewBtn = document.getElementById('monthly-view-btn');
    const listViewContainer = document.getElementById('list-view-container');
    const calendarContainer = document.querySelector('.calendar-container');

    // 모달 요소
    const modal = document.getElementById('meal-modal');
    const modalDate = document.getElementById('modal-date');
    const modalMealDetails = document.getElementById('modal-meal-details');
    const nutritionChartCanvas = document.getElementById('nutrition-chart');
    const closeModalBtn = document.querySelector('.close-btn');

    let currentSchool = null;
    let currentDate = new Date();
    let currentView = 'today'; // 현재 보기 모드 상태
    let nutritionChart = null; // 모달 차트
    let todayChart = null; // 오늘 보기 차트
    let searchDebounce;

    const allergyMap = { '1': '난류', '2': '우유', '3': '메밀', '4': '땅콩', '5': '대두', '6': '밀', '7': '고등어', '8': '게', '9': '새우', '10': '돼지고기', '11': '복숭아', '12': '토마토', '13': '아황산류', '14': '호두', '15': '닭고기', '16': '쇠고기', '17': '오징어', '18': '조개류(굴, 전복, 홍합 포함)', '19': '잣' };

    const formatDate = (dateString) => {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
    };

    // --- 보기 모드 변경 ---
    const updateView = (view) => {
        currentView = view;
        todayViewBtn.classList.toggle('active', view === 'today');
        weeklyViewBtn.classList.toggle('active', view === 'weekly');
        monthlyViewBtn.classList.toggle('active', view === 'monthly');

        listViewContainer.classList.toggle('hidden', view === 'monthly');
        calendarContainer.classList.toggle('hidden', view !== 'monthly');

        if (view === 'today') {
            renderTodayView();
        } else if (view === 'weekly') {
            renderWeeklyView();
        } else if (view === 'monthly') {
            renderCalendar();
        }
    };

    todayViewBtn.addEventListener('click', () => updateView('today'));
    weeklyViewBtn.addEventListener('click', () => updateView('weekly'));
    monthlyViewBtn.addEventListener('click', () => updateView('monthly'));

    // --- 오늘의 급식 렌더링 (수정) ---
    const renderTodayView = async () => {
        listViewContainer.innerHTML = `
            <div id="today-meals"><h3>오늘의 급식</h3></div>
            <div id="today-chart-container" class="hidden">
                <h3>오늘의 영양 정보</h3>
                <canvas id="today-nutrition-chart"></canvas>
                <div id="today-allergy-info" class="allergy-info-box hidden"></div>
            </div>
        `;
        const todayMealsContainer = document.getElementById('today-meals');

        if (!currentSchool) {
            todayMealsContainer.innerHTML += '<p>학교를 먼저 선택해주세요.</p>';
            return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        try {
            const meals = await fetchMeals(year, month);
            const todayMeals = meals.filter(m => m.MLSV_YMD === `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`);

            if (todayMeals.length === 0) {
                todayMealsContainer.innerHTML += '<p>오늘 급식 정보가 없습니다.</p>';
                return;
            }

            let totalNutritions = { carb: 0, prot: 0, fat: 0 };
            const allAllergies = new Set();

            todayMeals.forEach(meal => {
                const mealCard = document.createElement('div');
                mealCard.className = 'meal-card';
                const menuItems = meal.DDISH_NM.replace(/<br\/>/g, '</li><li>');
                
                const mealTitle = todayMeals.length > 1 ? `<h4>${meal.MMEAL_SC_NM}</h4>` : '';
                mealCard.innerHTML = `${mealTitle}<ul><li>${menuItems}</li></ul>`;
                todayMealsContainer.appendChild(mealCard);

                const ntrInfo = meal.NTR_INFO || '';
                const carbMatch = ntrInfo.match(/탄수화물\(g\)\s*:\s*([\d.]+)/);
                const protMatch = ntrInfo.match(/단백질\(g\)\s*:\s*([\d.]+)/);
                const fatMatch = ntrInfo.match(/지방\(g\)\s*:\s*([\d.]+)/);

                if (carbMatch) totalNutritions.carb += parseFloat(carbMatch[1]);
                if (protMatch) totalNutritions.prot += parseFloat(protMatch[1]);
                if (fatMatch) totalNutritions.fat += parseFloat(fatMatch[1]);

                const allergyNumbers = meal.DDISH_NM.match(/\((\d+\.?)+\)/g);
                if (allergyNumbers) {
                    allergyNumbers.forEach(group => {
                        group.replace(/[\(\)]/g, '').split('.').forEach(num => {
                            if(num) allAllergies.add(num);
                        });
                    });
                }
            });

            renderTodayChart(totalNutritions);
            renderTodayAllergyInfo(allAllergies);

        } catch (error) {
            console.error('오늘 급식 정보 오류:', error);
            todayMealsContainer.innerHTML += '<p>급식 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    };
    
    // --- 오늘의 알레르기 정보 표시 ---
    const renderTodayAllergyInfo = (allergies) => {
        const allergyInfoBox = document.getElementById('today-allergy-info');
        
        if (allergies.size === 0) {
            allergyInfoBox.classList.add('hidden');
            return;
        }
        
        allergyInfoBox.innerHTML = '<h4>알레르기 정보</h4>';
        const allergyList = document.createElement('p');
        allergyList.textContent = Array.from(allergies).sort((a, b) => a - b)
            .map(num => `${num}: ${allergyMap[num] || '정보없음'}`).join(', ');
        allergyInfoBox.appendChild(allergyList);
        allergyInfoBox.classList.remove('hidden');
    };

    // --- 오늘의 영양 정보 차트 렌더링 ---
    const renderTodayChart = async (nutritionData) => {
        const chartContainer = document.getElementById('today-chart-container');
        if (todayChart) todayChart.destroy();

        if (!nutritionData || (nutritionData.carb === 0 && nutritionData.prot === 0 && nutritionData.fat === 0)) {
            chartContainer.classList.add('hidden');
            return;
        }
        chartContainer.classList.remove('hidden');

        // 월 평균 영양소 데이터 가져오기
        const monthlyAvg = await getMonthlyAverageNutrition();
        
        // 교육청 평균 영양소 데이터 가져오기
        const today = new Date();
        const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const districtAvg = await getDistrictAverageNutrition(dateStr);
        
        const ctx = document.getElementById('today-nutrition-chart').getContext('2d');
        todayChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['탄수화물(g)', '단백질(g)', '지방(g)'],
                datasets: [{
                    label: '오늘',
                    data: [nutritionData.carb.toFixed(1), nutritionData.prot.toFixed(1), nutritionData.fat.toFixed(1)],
                    backgroundColor: ['rgba(255, 193, 7, 0.7)', 'rgba(33, 150, 243, 0.7)', 'rgba(76, 175, 80, 0.7)'],
                    borderColor: ['rgba(255, 193, 7, 1)', 'rgba(33, 150, 243, 1)', 'rgba(76, 175, 80, 1)'],
                    borderWidth: 1
                },
                {
                    label: '월 평균',
                    data: [
                        monthlyAvg.carb.toFixed(1),
                        monthlyAvg.prot.toFixed(1),
                        monthlyAvg.fat.toFixed(1)
                    ],
                    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 0, // 선 없앰
                    type: 'line',
                    pointRadius: 6, // 점 크기 약간 키움
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    showLine: false // 선 연결 안 함
                },
                {
                    label: '교육청 평균',
                    data: [
                        districtAvg.carb.toFixed(1),
                        districtAvg.prot.toFixed(1),
                        districtAvg.fat.toFixed(1)
                    ],
                    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 1)'],
                    borderWidth: 0, // 선 없앰
                    type: 'line',
                    pointRadius: 6, // 점 크기 약간 키움
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    showLine: false // 선 연결 안 함
                }]
            },
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                plugins: { 
                    legend: { display: false }, // 범례 숨김
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetIndex = context.datasetIndex;
                                const value = context.parsed.x;
                                if (datasetIndex === 0) return `오늘: ${value}g`;
                                if (datasetIndex === 1) return `월 평균: ${value}g`;
                                if (datasetIndex === 2) return `교육청 평균: ${value}g`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    };

    // --- 월 평균 영양소 계산 함수 (새로 추가) ---
    const getMonthlyAverageNutrition = async () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        
        try {
            // 월간 급식 데이터 가져오기
            const meals = await fetchMeals(year, month);
            if (!meals || meals.length === 0) {
                return { carb: 0, prot: 0, fat: 0 };
            }
            
            // 영양소 정보가 있는 모든 급식 데이터 필터링
            const mealsWithNutrition = meals.filter(meal => meal.NTR_INFO);
            if (mealsWithNutrition.length === 0) {
                return { carb: 0, prot: 0, fat: 0 };
            }
            
            // 영양소 평균 계산
            let totalCarb = 0, totalProt = 0, totalFat = 0;
            let mealCount = 0;
            
            mealsWithNutrition.forEach(meal => {
                const ntrInfo = meal.NTR_INFO || '';
                const carbMatch = ntrInfo.match(/탄수화물\(g\)\s*:\s*([\d.]+)/);
                const protMatch = ntrInfo.match(/단백질\(g\)\s*:\s*([\d.]+)/);
                const fatMatch = ntrInfo.match(/지방\(g\)\s*:\s*([\d.]+)/);
                
                if (carbMatch && protMatch && fatMatch) {
                    totalCarb += parseFloat(carbMatch[1]);
                    totalProt += parseFloat(protMatch[1]);
                    totalFat += parseFloat(fatMatch[1]);
                    mealCount++;
                }
            });
            
            // 평균 계산
            return {
                carb: mealCount > 0 ? totalCarb / mealCount : 0,
                prot: mealCount > 0 ? totalProt / mealCount : 0,
                fat: mealCount > 0 ? totalFat / mealCount : 0
            };
            
        } catch (error) {
            console.error('월 평균 영양소 계산 오류:', error);
            return { carb: 0, prot: 0, fat: 0 };
        }
    };

    // --- 교육청 평균 영양소 가져오기 (캐싱 추가) ---
    const getDistrictAverageNutrition = async (date) => {
        if (!currentSchool) return { carb: 0, prot: 0, fat: 0 };
        
        // 세션 스토리지에서 캐시된 데이터 확인 (1시간 유효)
        const cacheKey = `districtAvg_${currentSchool.ATPT_OFCDC_SC_CODE}_${date}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheTime = cachedData.timestamp;
                const now = Date.now();
                
                // 1시간(3600000ms) 이내면 캐시 사용
                if (now - cacheTime < 3600000) {
                    console.log('교육청 평균 캐시 사용:', date);
                    return cachedData.data;
                }
            } catch (e) {
                console.error('캐시 파싱 오류:', e);
            }
        }
        
        try {
            const response = await fetch(`/api/getDistrictAverage?officeCode=${currentSchool.ATPT_OFCDC_SC_CODE}&date=${date}`);
            const data = await response.json();
            
            if (data.error || !data.averageNutrition) {
                console.error('교육청 평균 영양소 오류:', data.error || '데이터 없음');
                return { carb: 0, prot: 0, fat: 0 };
            }
            
            // 세션 스토리지에 캐시 저장
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data: data.averageNutrition,
                timestamp: Date.now()
            }));
            
            return data.averageNutrition;
        } catch (error) {
            console.error('교육청 평균 영양소 가져오기 오류:', error);
            return { carb: 0, prot: 0, fat: 0 };
        }
    };

    // --- 주간 보기 렌더링 (수정) ---
    const renderWeeklyView = async () => {
        listViewContainer.innerHTML = '';
        if (!currentSchool) {
            listViewContainer.innerHTML += '<p>학교를 먼저 선택해주세요.</p>';
            return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(new Date().setDate(diff));

        try {
            const currentMonthMeals = await fetchMeals(year, month);
            const nextMonthDate = new Date(monday);
            nextMonthDate.setDate(monday.getDate() + 4);
            const nextMonth = nextMonthDate.getMonth() + 1;
            const nextMonthMeals = (nextMonth !== month) ? await fetchMeals(nextMonthDate.getFullYear(), nextMonth) : [];
            const meals = [...currentMonthMeals, ...nextMonthMeals];

            for (let i = 0; i < 5; i++) {
                const currentDay = new Date(monday);
                currentDay.setDate(monday.getDate() + i);
                
                const ymd = `${currentDay.getFullYear()}${String(currentDay.getMonth() + 1).padStart(2, '0')}${String(currentDay.getDate()).padStart(2, '0')}`;
                const dayMeals = meals.filter(m => m.MLSV_YMD === ymd);

                const dayCard = document.createElement('div');
                dayCard.className = 'meal-card';
                
                if (currentDay.toDateString() === new Date().toDateString()) {
                    dayCard.classList.add('today');
                }

                dayCard.innerHTML = `<h4>${currentDay.getMonth() + 1}월 ${currentDay.getDate()}일 (${'월화수목금'[i]})</h4>`;

                if (dayMeals.length > 0) {
                    dayCard.dataset.date = ymd;
                    dayCard.dataset.meal = dayMeals.map(m => JSON.stringify(m)).join('||') + '||';
                    dayCard.style.cursor = 'pointer';

                    dayMeals.forEach(meal => {
                        const pureMenu = meal.DDISH_NM.replace(/\([^)]*\)/g, '').replace(/<br\/>/g, '</li><li>');
                        const mealTitle = dayMeals.length > 1 ? `<h5>${meal.MMEAL_SC_NM}</h5>` : '';
                        dayCard.innerHTML += `${mealTitle}<ul><li>${pureMenu}</li></ul>`;
                    });
                } else {
                    dayCard.innerHTML += '<p>급식 정보가 없습니다.</p>';
                }
                listViewContainer.appendChild(dayCard);
            }
        } catch (error) {
            console.error('주간 급식 정보 오류:', error);
            listViewContainer.innerHTML += '<p>급식 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    };

    // --- 급식 정보 가져오는 함수 (캐싱 추가) ---
    const fetchMeals = async (year, month) => {
        if (!currentSchool) return [];
        
        // 세션 스토리지에서 캐시된 데이터 확인 (30분 유효)
        const cacheKey = `meals_${currentSchool.SD_SCHUL_CODE}_${year}_${month}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheTime = cachedData.timestamp;
                const now = Date.now();
                
                // 30분(1800000ms) 이내면 캐시 사용
                if (now - cacheTime < 1800000) {
                    console.log(`급식 캐시 사용: ${year}-${month}`);
                    return cachedData.data;
                }
            } catch (e) {
                console.error('급식 캐시 파싱 오류:', e);
            }
        }
        
        try {
            const response = await fetch(`/api/getMeal?schoolCode=${currentSchool.SD_SCHUL_CODE}&officeCode=${currentSchool.ATPT_OFCDC_SC_CODE}&year=${year}&month=${String(month).padStart(2, '0')}`);
            const data = await response.json();
            
            // 세션 스토리지에 캐시 저장
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
            
            return data;
        } catch (error) {
            console.error(`급식 정보 오류 (${year}-${month}):`, error);
            return [];
        }
    };

    // --- 내 학교 설정 ---
    const loadMySchool = () => {
        const savedSchool = localStorage.getItem('mySchool');
        if (savedSchool) {
            currentSchool = JSON.parse(savedSchool);
            mySchoolName.textContent = `내 학교: ${currentSchool.SCHUL_NM}`;
            schoolSearchInput.value = currentSchool.SCHUL_NM;
            updateView(currentView);
        }
    };

    setMySchoolBtn.addEventListener('click', () => {
        if (schoolSearchInput.value && currentSchool && schoolSearchInput.value === currentSchool.SCHUL_NM) {
            localStorage.setItem('mySchool', JSON.stringify(currentSchool));
            mySchoolName.textContent = `내 학교: ${currentSchool.SCHUL_NM}`;
            alert('내 학교로 설정되었습니다.');
        } else {
            alert('학교를 검색하고 선택해주세요.');
        }
    });

    viewMySchoolBtn.addEventListener('click', () => {
        loadMySchool();
    });

    // --- 학교 검색 ---
    schoolSearchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        const schoolName = schoolSearchInput.value;
        if (schoolName.length < 2) {
            schoolSearchResults.innerHTML = '';
            return;
        }
        searchDebounce = setTimeout(async () => {
            try {
                const response = await fetch(`/api/searchSchool?schoolName=${schoolName}`);
                const schools = await response.json();
                renderSchoolSearchResults(schools);
            } catch (error) {
                console.error('학교 검색 오류:', error);
            }
        }, 300);
    });

    const renderSchoolSearchResults = (schools) => {
        schoolSearchResults.innerHTML = '';
        if (schools.length === 0) {
            schoolSearchResults.innerHTML = '<div>검색 결과가 없습니다.</div>';
            return;
        }
        schools.forEach(school => {
            const div = document.createElement('div');
            div.textContent = `${school.SCHUL_NM} (${school.ORG_RDNMA})`;
            div.addEventListener('click', () => {
                currentSchool = school;
                schoolSearchInput.value = school.SCHUL_NM;
                schoolSearchResults.innerHTML = '';
                updateView(currentView);
            });
            schoolSearchResults.appendChild(div);
        });
    };

    // --- 외부 클릭 시 검색 결과 닫기 ---
    document.addEventListener('click', (e) => {
        const isClickInsideSearch = schoolSearchInput.contains(e.target) || 
                                   searchBtn.contains(e.target) || 
                                   schoolSearchResults.contains(e.target);
        
        if (!isClickInsideSearch && schoolSearchResults.innerHTML !== '') {
            schoolSearchResults.innerHTML = '';
        }
    });

    // --- 달력 렌더링 ---
    const renderCalendar = async () => {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthYear.textContent = `${year}년 ${month + 1}월`;

        const days = ['월', '화', '수', '목', '금'];
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day-name');
            dayEl.textContent = day;
            calendarGrid.appendChild(dayEl);
        });
        
        // 해당 월의 첫 날짜 구하기
        const firstDay = new Date(year, month, 1);
        // 해당 월의 첫 날짜의 요일 (0: 일, 1: 월, ..., 6: 토)
        const firstDayOfWeek = firstDay.getDay(); 
        // 해당 월의 마지막 날짜 구하기
        const lastDate = new Date(year, month + 1, 0).getDate();
        
        // 달력 배치를 위한 빈 셀 추가 (월요일부터 시작하도록)
        const emptyCellCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        for (let i = 0; i < emptyCellCount; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('date', 'empty');
            calendarGrid.appendChild(emptyCell);
        }
        
        // 날짜 셀 추가
        for (let i = 1; i <= lastDate; i++) {
            const currentDay = new Date(year, month, i);
            const dayOfWeek = currentDay.getDay();

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const dateEl = document.createElement('div');
                dateEl.classList.add('date');
                const dateNumEl = document.createElement('span');
                dateNumEl.classList.add('date-number');
                dateNumEl.textContent = i;
                if (currentDay.toDateString() === new Date().toDateString()) {
                    dateNumEl.classList.add('today');
                }
                dateEl.appendChild(dateNumEl);
                dateEl.dataset.date = `${year}${String(month + 1).padStart(2, '0')}${String(i).padStart(2, '0')}`;
                calendarGrid.appendChild(dateEl);
            }
        }

        const meals = await fetchMeals(year, month + 1);
        displayMealsOnCalendar(meals);
    };

    // --- 급식 정보 달력에 표시 ---
    const displayMealsOnCalendar = (meals) => {
        meals.forEach(meal => {
            const dateEl = calendarGrid.querySelector(`[data-date="${meal.MLSV_YMD}"]`);
            if (dateEl) {
                const pureMenuHTML = meal.DDISH_NM.replace(/\([^)]*\)/g, '').replace(/<br\/>/g, '<br>');
                const mealContainer = document.createElement('div');
                mealContainer.innerHTML = pureMenuHTML;
                dateEl.appendChild(mealContainer);

                if (!dateEl.dataset.meal) dateEl.dataset.meal = '';
                dateEl.dataset.meal += JSON.stringify(meal) + '||';
            }
        });
    };
    
    // --- 이벤트 리스너 (이벤트 위임) ---
    calendarGrid.addEventListener('click', (e) => {
        const dateEl = e.target.closest('.date');
        if (dateEl && dateEl.dataset.meal) {
            displayMealModal(dateEl.dataset);
        }
    });

    listViewContainer.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.meal-card');
        if (cardEl && cardEl.dataset.meal) {
            displayMealModal(cardEl.dataset);
        }
    });

    // --- 모달 관련 함수 ---
    const displayMealModal = (dataset) => {
        modalDate.textContent = formatDate(dataset.date);
        modalMealDetails.innerHTML = '';
        
        const mealsData = dataset.meal.slice(0, -2).split('||');
        const ul = document.createElement('ul');
        const allAllergies = new Set();
        let totalNutritions = { cal: 0, carb: 0, prot: 0, fat: 0 };

        mealsData.forEach(mealStr => {
            const meal = JSON.parse(mealStr);
            const li = document.createElement('li');
            const mealTitle = mealsData.length > 1 ? `[${meal.MMEAL_SC_NM}] ` : '';
            li.textContent = `${mealTitle}${meal.DDISH_NM.replace(/<br\/>/g, ', ')}`;
            ul.appendChild(li);

            const allergyNumbers = meal.DDISH_NM.match(/\((\d+\.?)+\)/g);
            if (allergyNumbers) {
                allergyNumbers.forEach(group => {
                    group.replace(/[\(\)]/g, '').split('.').forEach(num => {
                        if(num) allAllergies.add(num);
                    });
                });
            }

            totalNutritions.cal += parseFloat(meal.CAL_INFO) || 0;
            const ntrInfo = meal.NTR_INFO || '';
            const carbMatch = ntrInfo.match(/탄수화물\(g\)\s*:\s*([\d.]+)/);
            const protMatch = ntrInfo.match(/단백질\(g\)\s*:\s*([\d.]+)/);
            const fatMatch = ntrInfo.match(/지방\(g\)\s*:\s*([\d.]+)/);

            if (carbMatch) totalNutritions.carb += parseFloat(carbMatch[1]);
            if (protMatch) totalNutritions.prot += parseFloat(protMatch[1]);
            if (fatMatch) totalNutritions.fat += parseFloat(fatMatch[1]);
        });

        modalMealDetails.appendChild(ul);

        if (allAllergies.size > 0) {
            const allergyInfoDiv = document.createElement('div');
            allergyInfoDiv.innerHTML = '<h4>알레르기 정보</h4>';
            const allergyList = document.createElement('p');
            allergyList.style.fontSize = '0.9em';
            allergyList.textContent = Array.from(allAllergies).sort((a, b) => a - b).map(num => `${num}: ${allergyMap[num] || '정보없음'}`).join(', ');
            allergyInfoDiv.appendChild(allergyList);
            modalMealDetails.appendChild(allergyInfoDiv);
        }

        updateNutritionChart(totalNutritions);
        modal.style.display = 'flex';
        history.pushState({ modalOpen: true }, null);
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeModalBtn.addEventListener('click', () => {
        if (modal.style.display === 'flex') history.back();
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            if (modal.style.display === 'flex') history.back();
        }
    });

    window.addEventListener('popstate', (event) => {
        if (modal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- 모달 영양 정보 차트 ---
    const updateNutritionChart = async (nutritionData) => {
        if (nutritionChart) nutritionChart.destroy();

        const nutritionInfoDiv = document.getElementById('modal-nutrition-info');
        const noDataText = nutritionInfoDiv.querySelector('.no-data');
        if (noDataText) noDataText.remove();

        if (!nutritionData || (nutritionData.carb === 0 && nutritionData.prot === 0 && nutritionData.fat === 0)) {
            nutritionChartCanvas.style.display = 'none';
            const newNoDataText = document.createElement('p');
            newNoDataText.textContent = '상세 영양 정보가 제공되지 않았습니다.';
            newNoDataText.className = 'no-data';
            nutritionInfoDiv.appendChild(newNoDataText);
            return;
        }
        
        // 월 평균 영양소 데이터 가져오기
        const monthlyAvg = await getMonthlyAverageNutrition();
        
        // 교육청 평균 영양소 데이터 가져오기 (모달에 표시된 날짜 기준)
        const dateText = modalDate.textContent; // "YYYY년 M월 D일" 형식
        const year = dateText.match(/(\d+)년/)[1];
        const month = dateText.match(/(\d+)월/)[1].padStart(2, '0');
        const day = dateText.match(/(\d+)일/)[1].padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const districtAvg = await getDistrictAverageNutrition(dateStr);
        
        nutritionChartCanvas.style.display = 'block';
        const ctx = nutritionChartCanvas.getContext('2d');
        nutritionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['탄수화물(g)', '단백질(g)', '지방(g)'],
                datasets: [{
                    label: '선택 날짜',
                    data: [nutritionData.carb.toFixed(1), nutritionData.prot.toFixed(1), nutritionData.fat.toFixed(1)],
                    backgroundColor: ['rgba(255, 193, 7, 0.7)', 'rgba(33, 150, 243, 0.7)', 'rgba(76, 175, 80, 0.7)'],
                    borderColor: ['rgba(255, 193, 7, 1)', 'rgba(33, 150, 243, 1)', 'rgba(76, 175, 80, 1)'],
                    borderWidth: 1
                },
                {
                    label: '월 평균',
                    data: [
                        monthlyAvg.carb.toFixed(1),
                        monthlyAvg.prot.toFixed(1),
                        monthlyAvg.fat.toFixed(1)
                    ],
                    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 0, // 선 없앰
                    type: 'line',
                    pointRadius: 6, // 점 크기 약간 키움
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    showLine: false // 선 연결 안 함
                },
                {
                    label: '교육청 평균',
                    data: [
                        districtAvg.carb.toFixed(1),
                        districtAvg.prot.toFixed(1),
                        districtAvg.fat.toFixed(1)
                    ],
                    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 1)'],
                    borderWidth: 0, // 선 없앰
                    type: 'line',
                    pointRadius: 6, // 점 크기 약간 키움
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    showLine: false // 선 연결 안 함
                }]
            },
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                plugins: { 
                    legend: { display: false }, // 범례 숨김
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetIndex = context.datasetIndex;
                                const value = context.parsed.x;
                                if (datasetIndex === 0) return `선택 날짜: ${value}g`;
                                if (datasetIndex === 1) return `월 평균: ${value}g`;
                                if (datasetIndex === 2) return `교육청 평균: ${value}g`;
                            }
                        }
                    },
                    title: { 
                        display: true, 
                        text: `총 칼로리: ${nutritionData.cal.toFixed(2)} kcal` 
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    };

    // --- 달력 이동 ---
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // --- 초기화 ---
    loadMySchool();
});
