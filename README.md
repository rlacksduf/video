# Vido — React 영상 플랫폼 MVP

## 1. 설치
```bash
npm install
cp .env.example .env.local
```
`.env.local`에 Supabase URL과 Publishable Key를 입력하세요.

## 2. Supabase 설정
Supabase SQL Editor에서 `supabase/schema.sql` 전체를 실행하세요.

이 프로젝트는 Supabase Auth/Database/Storage를 사용합니다. 이메일 인증은 Supabase Auth 설정에서 Email provider를 활성화해 사용합니다.

## 3. 실행
```bash
npm run dev
```

## 현재 포함된 기능
- 회원가입/로그인/로그아웃
- 이메일 인증 기반 회원가입
- 프로필 수정/비밀번호 변경 UI
- 영상 업로드 + 제목/설명/썸네일/카테고리/태그
- 영상 재생/전체화면(브라우저 기본 컨트롤)/재생 위치 저장
- 좋아요/영상 저장
- 검색/최신순/인기순/조회수순
- 댓글
- 좋아요 목록/저장 목록
- 관리자 페이지 기본 골격

## 다음 단계
1. 조회수 증가를 서버 RPC로 이동
2. 대댓글/댓글 좋아요 UI 추가
3. 실제 watch_history DB 저장
4. 관리자 역할 검증을 RLS 함수로 강화
5. 영상 트랜스코딩(HLS)으로 화질 선택 지원
6. 신고/차단/정지/감사 로그 추가
