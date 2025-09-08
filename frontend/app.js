document.addEventListener('DOMContentLoaded', () => {
    // --- 변수 선언 (모달 관련 추가) ---
    const schoolSearchInput = document.getElementById('school-search-input');
    const searchBtn = document.getElementById('search-btn');
    const schoolSearchResults = document.getElementById('school-search-results');
    const mySchoolName = document.getElementById('my-school-name');
    const setMySchoolBtn = document.getElementById('set-my-school-btn');
    const viewMySchoolBtn = document.getElementById('view-my-school-btn'); // 버튼 변수 추가
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const currentMonthYear = document.getElementById('current-month-year');
    const calendarGrid = document.getElementById('calendar-grid');
    const mealDetails = document.getElementById('meal-details'); // 이 변수는 이제 모달 내부에서 사용됩니다.
    const nutritionChartCanvas = document.getElementById('nutrition-chart');

    // 모달 요소
    const modal = document.getElementById('meal-modal');
    const modalDate = document.getElementById('modal-date');
    const modalMealDetails = document.getElementById('modal-meal-details');
    const closeModalBtn = document.querySelector('.close-btn');

    let currentSchool = null;
    let currentDate = new Date();
    let nutritionChart = null;
    let searchDebounce;

    // --- 알레르기 정보 맵 ---
    const allergyMap = {
        '1': '난류', '2': '우유', '3': '메밀', '4': '땅콩', '5': '대두',
        '6': '밀', '7': '고등어', '8': '게', '9': '새우', '10': '돼지고기',
        '11': '복숭아', '12': '토마토', '13': '아황산류', '14': '호두',
        '15': '닭고기', '16': '쇠고기', '17': '오징어', '18': '조개류(굴, 전복, 홍합 포함)', '19': '잣'
    };

    // --- 날짜 포맷 함수 추가 ---
    const formatDate = (dateString) => {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
    };

    // --- 내 학교 설정 (변경 없음) ---
    const loadMySchool = () => {
        const savedSchool = localStorage.getItem('mySchool');
        if (savedSchool) {
            currentSchool = JSON.parse(savedSchool);
            mySchoolName.textContent = `내 학교: ${currentSchool.SCHUL_NM}`;
            schoolSearchInput.value = currentSchool.SCHUL_NM;
            renderCalendar();
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

    // "내 학교 보기" 버튼 이벤트 리스너 추가
    viewMySchoolBtn.addEventListener('click', () => {
        loadMySchool();
    });


    // --- 학교 검색 (실시간으로 변경) ---
    schoolSearchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        const schoolName = schoolSearchInput.value;
        if (schoolName.length < 2) {
            schoolSearchResults.innerHTML = '';
            return;
        }
        // 300ms 지연 후 검색 실행 (과도한 API 호출 방지)
        searchDebounce = setTimeout(async () => {
            try {
                // 'http://localhost:3000' 부분을 삭제합니다.
                const response = await fetch(`/api/searchSchool?schoolName=${schoolName}`);
                const schools = await response.json();
                renderSchoolSearchResults(schools);
            } catch (error) {
                console.error('학교 검색 오류:', error);
                schoolSearchResults.innerHTML = '<div>검색 중 오류 발생</div>';
            }
        }, 300);
    });

    const renderSchoolSearchResults = (schools) => {
        // ... (기존 코드와 거의 동일, 클릭 시 검색창에 학교 이름 채우고 결과 숨김)
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
                schoolSearchResults.innerHTML = ''; // 결과 숨기기
                renderCalendar(); // 학교 선택 시 바로 달력 리프레시
            });
            schoolSearchResults.appendChild(div);
        });
    };

    // --- 달력 렌더링 (내부에 메뉴 표시하도록 수정) ---
    const renderCalendar = async () => {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthYear.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // 요일 헤더
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day-name');
            dayEl.textContent = day;
            calendarGrid.appendChild(dayEl);
        });

        // 빈 날짜
        for (let i = 0; i < firstDay; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        // 날짜 채우기
        for (let i = 1; i <= lastDate; i++) {
            const dateEl = document.createElement('div');
            dateEl.classList.add('date');
            
            const dateNumEl = document.createElement('span');
            dateNumEl.classList.add('date-number');
            dateNumEl.textContent = i;
            dateEl.appendChild(dateNumEl);

            const date = new Date(year, month, i);
            if (date.toDateString() === new Date().toDateString()) {
                dateNumEl.classList.add('today');
            }
            dateEl.dataset.date = `${year}${String(month + 1).padStart(2, '0')}${String(i).padStart(2, '0')}`;
            calendarGrid.appendChild(dateEl);
        }

        if (currentSchool) {
            await fetchAndDisplayMeals(year, month + 1);
        }
    };

    // --- 급식 정보 가져오기 및 달력에 표시 (수정) ---
    const fetchAndDisplayMeals = async (year, month) => {
        try {
            // 'http://localhost:3000' 부분을 삭제합니다.
            const response = await fetch(`/api/getMeal?schoolCode=${currentSchool.SD_SCHUL_CODE}&officeCode=${currentSchool.ATPT_OFCDC_SC_CODE}&year=${year}&month=${String(month).padStart(2, '0')}`);
            const meals = await response.json();
            
            meals.forEach(meal => {
                const dateEl = calendarGrid.querySelector(`[data-date="${meal.MLSV_YMD}"]`);
                if (dateEl) {
                    // 메뉴 이름만 추출하여 한 줄씩 표시 (div 대신 innerHTML 사용)
                    const pureMenuHTML = meal.DDISH_NM
                        .replace(/\([^)]*\)/g, '') // 괄호와 내용(알레르기 정보) 제거
                        .replace(/<br\/>/g, '<br>') // <br/>을 <br> 태그로 유지
                        .split('<br>')
                        .map(item => item.trim())
                        .filter(item => item)
                        .join('<br>'); // 각 메뉴를 <br>로 연결

                    const mealContainer = document.createElement('div');
                    mealContainer.innerHTML = pureMenuHTML;
                    dateEl.appendChild(mealContainer);


                    // 데이터셋에 전체 정보 저장
                    if (!dateEl.dataset.meal) dateEl.dataset.meal = '';
                    dateEl.dataset.meal += JSON.stringify(meal) + '||'; // 구분자 사용
                }
            });

        } catch (error) {
            console.error('급식 정보 오류:', error);
        }
    };
    
    // --- 달력 클릭 이벤트 (변경 없음) ---
    calendarGrid.addEventListener('click', (e) => {
        const target = e.target.closest('.date');
        if (!target || !target.dataset.meal) {
            // 급식 정보가 없으면 모달을 열지 않음
            return;
        }
        displayMealModal(target.dataset);
    });

    // --- 모달 관련 함수 (수정) ---
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
            li.textContent = `[${meal.MMEAL_SC_NM}] ${meal.DDISH_NM.replace(/<br\/>/g, ', ')}`;
            ul.appendChild(li);

            // 알레르기 정보 수집
            const allergyNumbers = meal.DDISH_NM.match(/\((\d+\.?)+\)/g);
            if (allergyNumbers) {
                allergyNumbers.forEach(group => {
                    group.replace(/[\(\)]/g, '').split('.').forEach(num => {
                        if(num) allAllergies.add(num);
                    });
                });
            }

            // 영양 정보 파싱 및 합산 (공백 처리를 위한 정규식 수정)
            totalNutritions.cal += parseFloat(meal.CAL_INFO) || 0;
            
            const ntrInfo = meal.NTR_INFO || '';
            // 콜론(:) 뒤에 공백이 여러 개 있을 수 있는 경우를 대비해 \s* 추가
            const carbMatch = ntrInfo.match(/탄수화물\(g\)\s*:\s*([\d.]+)/);
            const protMatch = ntrInfo.match(/단백질\(g\)\s*:\s*([\d.]+)/);
            const fatMatch = ntrInfo.match(/지방\(g\)\s*:\s*([\d.]+)/);

            if (carbMatch) totalNutritions.carb += parseFloat(carbMatch[1]);
            if (protMatch) totalNutritions.prot += parseFloat(protMatch[1]);
            if (fatMatch) totalNutritions.fat += parseFloat(fatMatch[1]);
        });

        modalMealDetails.appendChild(ul);

        // 알레르기 정보 표시
        if (allAllergies.size > 0) {
            const allergyInfoDiv = document.createElement('div');
            allergyInfoDiv.innerHTML = '<h4>알레르기 정보</h4>';
            const allergyList = document.createElement('p');
            allergyList.style.fontSize = '0.9em';
            allergyList.textContent = Array.from(allAllergies)
                .sort((a, b) => a - b)
                .map(num => `${num}: ${allergyMap[num] || '정보없음'}`)
                .join(', ');
            allergyInfoDiv.appendChild(allergyList);
            modalMealDetails.appendChild(allergyInfoDiv);
        }

        updateNutritionChart(totalNutritions);
        modal.style.display = 'flex';
    };

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    // --- 영양 정보 차트 (수정) ---
    const updateNutritionChart = (nutritionData) => {
        if (nutritionChart) {
            nutritionChart.destroy();
        }

        // 이전에 추가했을 수 있는 '정보 없음' 텍스트를 먼저 제거
        const nutritionInfoDiv = document.getElementById('modal-nutrition-info');
        const noDataText = nutritionInfoDiv.querySelector('.no-data');
        if (noDataText) {
            noDataText.remove();
        }

        // 칼로리뿐만 아니라 다른 영양 정보도 없는 경우에만 차트를 숨기도록 조건 수정
        if (!nutritionData || (nutritionData.carb === 0 && nutritionData.prot === 0 && nutritionData.fat === 0)) {
            nutritionChartCanvas.style.display = 'none';
            // 영양 정보가 없다는 텍스트를 표시
            const newNoDataText = document.createElement('p');
            newNoDataText.textContent = '상세 영양 정보가 제공되지 않았습니다.';
            newNoDataText.className = 'no-data';
            nutritionInfoDiv.appendChild(newNoDataText);
            return;
        }
        
        nutritionChartCanvas.style.display = 'block';
        const ctx = nutritionChartCanvas.getContext('2d');
        nutritionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['탄수화물(g)', '단백질(g)', '지방(g)'],
                datasets: [{
                    label: '영양성분',
                    data: [nutritionData.carb, nutritionData.prot, nutritionData.fat],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                    ],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `총 칼로리: ${nutritionData.cal.toFixed(2)} kcal`
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
    loadMySchool(); // loadMySchool이 renderCalendar를 호출함
});
