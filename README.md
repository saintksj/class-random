# 🏫 AI 사진인식 출석부 & 랜덤 발표자 뽑기 (by saintk)

선생님을 위한 스마트하고 다정한 교실 보조 웹 애플리케이션입니다.  
종이 출석부 사진을 찍어 올리면 Google Gemini AI가 학생들의 실명을 자동으로 읽어내 출석부에 등록하고, 칠판 애니메이션과 효과음, 음성(TTS)으로 공정하고 신나게 발표자를 뽑아줍니다.

---

## 📁 프로젝트 파일 구성 안내

- **`src/`**
  - `App.tsx`: 메인 화면, 칠판 룰렛 애니메이션, 소리 효과(Web Audio API), TTS 음성 안내, 학생 관리 로직
  - `data.ts`: 예시 학급 학생 명단 및 교실 팁 데이터
  - `types.ts`: 학생 데이터(`Student`), 당첨 기록(`PickHistory`) 타입 정의
  - `main.tsx`: 리액트 앱 시작 진입점
  - `index.css`: Tailwind CSS 스타일 정의
- **`api/parse-attendance.ts`**: Vercel 서버 함수 (Gemini로 출석부 사진 속 이름 추출)
- **`vercel.json`**: Vercel 배포 설정
- **`package.json`**: 프로젝트 실행에 필요한 패키지 및 스크립트 목록
- **`vite.config.ts`**: Vite 번들러 설정
- **`tsconfig.json`**: 타입스크립트 컴파일러 설정
- **`.env.example`**: 필요한 환경변수 안내 (`GEMINI_API_KEY`)

---

## 🚀 Vercel 배포 방법

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다. (Vite 자동 인식)
3. **Settings → Environment Variables**에 `GEMINI_API_KEY` 를 등록합니다.
4. **Deployments → Redeploy** 하면 완료!

*(API 키 없이도 직접 입력·랜덤 뽑기·TTS는 동작하고, 사진 인식만 키가 필요합니다)*

---

제작자: **saintk**  
선생님의 즐겁고 보람찬 수업을 온 마음으로 응원합니다! 🌸
