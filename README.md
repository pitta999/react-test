# E-Commerce Platform

## 📋 프로젝트 개요
React와 TypeScript를 사용하여 개발된 전자상거래 플랫폼입니다. Firebase를 백엔드로 활용하여 실시간 데이터 동기화와 안정적인 데이터 저장을 제공합니다.

## ✨ 주요 기능
- 사용자 인증 및 권한 관리
- 상품 관리 및 검색
- 장바구니 및 주문 처리
- T/T 및 신용카드 결제 시스템
- 송금증 업로드 및 관리
- 관리자 대시보드
- 다국어 지원 (한국어, 영어, 일본어)

## 🛠 기술 스택
### Frontend
- React 18.x
- TypeScript 4.x
- Tailwind CSS
- Headless UI
- Heroicons

### Backend
- Firebase
  - Authentication
  - Firestore
  - Storage
- Stripe (결제 처리)

### 개발 도구
- Vite
- ESLint
- Prettier
- Jest
- Cypress

## 🛠 프로젝트 구조

src/
├── components/ # 재사용 가능한 컴포넌트
├── pages/ # 페이지 컴포넌트
├── types/ # 타입 정의
├── utils/ # 유틸리티 함수
├── context/ # React Context
├── App.tsx # 메인 앱 컴포넌트
└── firebaseApp.ts # Firebase 설정
```

## 🚀 시작하기

### 필수 조건
- Node.js (v16 이상)
- npm 또는 yarn
- Firebase 계정
- Stripe 계정

### 설치
1. 저장소 클론
```bash
git clone [repository-url]
cd [project-name]
```

2. 의존성 설치
```bash
npm install
# 또는
yarn install
```

3. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정합니다:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

4. 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
```

## 🔧 빌드 및 배포

### 개발 빌드
```bash
npm run build:dev
# 또는
yarn build:dev
```

### 프로덕션 빌드
```bash
npm run build
# 또는
yarn build
```

### 배포
Firebase에 배포:
```bash
npm run deploy
# 또는
yarn deploy
```

## 🧪 테스트

### 단위 테스트 실행
```bash
npm test
# 또는
yarn test
```

### E2E 테스트 실행
```bash
npm run cypress
# 또는
yarn cypress
```

## 📚 주요 기능 상세 설명

### 1. 사용자 인증
- 이메일/비밀번호 로그인
- 소셜 로그인 (Google)
- 비밀번호 재설정
- 회원가입

### 2. 상품 관리
- 상품 목록 조회
- 상품 상세 정보
- 상품 검색 및 필터링
- 상품 카테고리 관리

### 3. 주문 시스템
- 장바구니 관리
- 주문 생성 및 확인
- 결제 처리 (T/T, 신용카드)
- 주문 상태 추적

### 4. 결제 시스템
- T/T 결제
  - 송금증 업로드
  - 결제 상태 관리
- 신용카드 결제 (Stripe)
  - 결제 처리
  - 결제 상태 관리

### 5. 관리자 기능
- 대시보드
- 주문 관리
- 사용자 관리
- 상품 관리
- 게시글 관리

## 🔒 보안

### 인증 보안
- JWT 토큰 기반 인증
- 세션 관리
- 비밀번호 암호화

### 데이터 보안
- Firebase Security Rules
- HTTPS
- CSRF 보호
- XSS 방지

## 🌐 다국어 지원
- 한국어 (ko)
- 영어 (en)
- 일본어 (ja)

## 📱 반응형 디자인
- 모바일 퍼스트 접근
- 반응형 그리드 시스템
- 적응형 이미지

## 🛠 개발 가이드라인

### 코드 스타일
- ESLint 규칙 준수
- Prettier 포맷팅
- TypeScript 타입 정의

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 코드 추가/수정
chore: 빌드 프로세스 또는 보조 도구 변경
```

### 브랜치 전략
- main: 프로덕션 브랜치
- develop: 개발 브랜치
- feature/*: 기능 개발 브랜치
- hotfix/*: 긴급 수정 브랜치

## 🤝 기여하기
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


