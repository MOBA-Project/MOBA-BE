# AI 추천 흐름 · UX 시나리오 · API 가이드

본 문서는 프론트에서 영화 추천 UX를 구현하기 위한 전체 흐름, 화면별 시나리오, 요청/응답 형식, 엔드포인트를 정리합니다. 경로 A(콘텐츠 기반)로 동작하며 TF‑IDF를 기본으로, `.env`에 `USE_SBERT=true`일 때 SBERT 임베딩까지 혼합합니다.

## 핵심 개념
- 로컬 우선: 추천/후보는 로컬 DB(사전 동기화)에서 먼저 가져옵니다.
- 폴백·자동 동기화: 로컬이 부족하면 TMDB로 즉시 응답하고, 백그라운드로 로컬 DB에 저장·임베딩 처리 후 재조회 시 반영됩니다.
- 개인화: 사용자가 좋아요/싫어요한 영화들의 벡터 평균(긍정/부정 분리)을 후보와 코사인 유사도로 비교하고, 장르/인기도/평점/최신성까지 재랭킹합니다.
- 메타: `partial`, `jobId(s)`, `nextRefreshAfter`, `source`로 응답 상태를 전달합니다.

---

## UX 시나리오
- 온보딩(최초 방문)
  - 장르 선택 화면 → `POST /v1/profile/genres` 저장
  - 바로 개인 추천 호출 → `GET /v1/reco/personal?userId=...&size=...`
    - 로컬 데이터 충분 → 전체 리스트 표시(`partial=false`)
    - 로컬 부족 → 부분 리스트 우선 표시(`partial=true`), 상단에 "업데이트 중…" 토스트·스피너 노출 → `nextRefreshAfter`(≈5초) 뒤 자동 재조회
- 홈/피드(재방문)
  - 앱 진입 즉시 `GET /v1/reco/personal` 호출, 바로 리스트 표시
  - 카드를 터치해 상세로 진입하거나, 카드의 좋아요/싫어요/보관 등을 수행
- 후보 그리드(선택 기능)
  - 장르별 둘러보기 → `GET /v1/reco/candidates?genres=...&page=1&size=20`
  - 일부만 폴백이면 `partial=true`이므로 동일 UX(토스트·자동 재조회)
- 상세 화면
  - 배우/제작진 호출 → `GET /movies/:id/credits`
  - 프로필 이미지는 `http://image.tmdb.org/t/p/{size}{profile_path}`로 빌드(예: `w185`)
- 피드백 루프(개인화 강화)
  - 좋아요/싫어요/클릭/완주 시 `POST /v1/reco/feedback`
  - 즉시 `GET /v1/reco/personal`을 재호출하여 “바로 반영됨” 체감 제공
- 빈/예외 케이스
  - 결과가 비어도 폴백으로 최소한의 리스트가 먼저 표시됨(`partial=true`)
  - 연속 폴백 시 최대 2~3회 자동 재시도 후, 안내 메시지와 함께 트렌딩/인기 섹션을 대체 컨텐츠로 노출

---

## 호출 순서(권장)
1) 선호 장르 저장(온보딩)
- POST `/v1/profile/genres` → `{ userId, favoriteGenres }`
2) 개인 추천 호출(핵심)
- GET `/v1/reco/personal?userId=...&size=...`
- `meta.partial=true`면 `meta.nextRefreshAfter`초 후 자동 재호출(또는 `GET /v1/reco/jobs/:id` 폴링 뒤 재호출)
3) 후보 그리드(옵션)
- GET `/v1/reco/candidates?genres=...&page=1&size=20`
4) 피드백(좋아요/싫어요/클릭/완주)
- POST `/v1/reco/feedback` → 즉시 `GET /v1/reco/personal` 재호출
5) 관리자 시드(개발/운영 보조)
- POST `/v1/admin/sync/discover?genres=28,878,53&pages=2`
- POST `/v1/admin/sync/movie/:id`

---

## 응답 메타 의미
- `partial`: true면 TMDB 폴백이 섞인 부분 결과(백그라운드 동기화 중)
- `jobId`/`jobIds`: 동기화 잡 식별자(선택, 폴링에 사용 가능)
- `nextRefreshAfter`: n초 뒤 재호출 권장
- `source`: `local`(로컬만) | `fallback`(TMDB만) | `mixed`(혼합)
프론트 처리 규칙
- `partial=false` → 그대로 렌더
- `partial=true` → 즉시 렌더 + 스피너/토스트 노출 → `nextRefreshAfter` 후 재호출(또는 `reco/jobs/:id` 완료 확인 후 재호출)

---

## 엔드포인트 정리
### 선호 장르 저장
- POST `/v1/profile/genres`
- Body
```json
{ "userId": "u_123", "favoriteGenres": [28, 878, 53] }
```
- 200
```json
{ "userId": "u_123", "favoriteGenres": [28, 878, 53] }
```
### 후보(장르 기반)
- GET `/v1/reco/candidates?genres=28,878,53&page=1&size=20`
- 200
```json
{
  "items": [
    { "id": 603, "title": "The Matrix", "genre_ids": [28, 878], "overview": "...", "poster_path": "/...jpg", "popularity": 92.4, "vote_average": 8.7, "release_date": "1999-03-31" }
  ],
  "meta": { "source": "local", "partial": false }
}
```
### 개인 추천(핵심)
- GET `/v1/reco/personal?userId=u_123&size=20`
- 200
```json
{
  "items": [
    {
      "movieId": 603,
      "title": "The Matrix",
      "posterPath": "/...jpg",
      "score": 0.91,
      "reasons": [
        "matchedGenres:2",
        "popularity:92.4",
        "vote:8.7",
        "recency:0.85",
        "tfidf:0.62",
        "sbert:0.71"
      ]
    }
  ],
  "meta": { "partial": false, "source": "local" }
}
```
- Notes
  - `reasons`는 설명가능성 제공(장르/인기/평점/최신성/TF‑IDF/SBERT/neg/explore 등)
  - `partial=true`면 위의 메타 처리 규칙 적용
### 피드백(좋아요/싫어요/클릭/완주)
- POST `/v1/reco/feedback`
- Body
```json
{ "userId": "u_123", "movieId": 603, "label": 1, "source": "like" }
```
- label: 1=positive(like/watch), 0=negative(skip)
- source: `like|click|watch|skip`
- 200 `{ "ok": true }`
### 잡 상태(옵션)
- GET `/v1/reco/jobs/:id`
- 200 `{ "id": "abc123", "status": "running", "updatedAt": 1730000000000 }`
- status: `pending|running|completed|failed|not_found`
### 영화 크레딧(배우/제작진)
- GET `/movies/:id/credits`
- 200 (TMDB 원본 필드 유지)
```json
{ "id": 550, "cast": [ { "id": 819, "name": "Edward Norton", "character": "...", "order": 0, "profile_path": "/...jpg" } ], "crew": [ { "id": 7467, "name": "David Fincher", "department": "Directing", "job": "Director", "profile_path": "/...jpg" } ] }
```
- 500 `{ "error": "Failed to fetch movie credits" }`
- 이미지 URL: `http://image.tmdb.org/t/p/{size}{profile_path}` (예: `w185`)
### 관리자(시드/온디맨드 동기화)
- POST `/v1/admin/sync/discover?genres=28,878,53&pages=2` → `{ "ok": true }`
- POST `/v1/admin/sync/movie/:id` → `{ "movieId": 603, "title": "The Matrix" }`

---

## 에러/엣지 대응
- TMDB 실패: 폴백 구간에서 500 발생 시 메시지 토스트 + 다음 재조회 유도
- 추천 결과 0개: 트렌딩/인기 리스트로 대체 노출(UX 가이드)
- 이미지 누락: placeholder 처리

---

## SBERT 사용 시
- 조건: `.env`에 `USE_SBERT=true` + `@xenova/transformers` 설치
- 동기화 시 SBERT 임베딩 생성·저장 → 추천 시 TF‑IDF + SBERT 코사인 혼합
- 응답 `reasons`에 `sbert:0.xxx`가 포함되면 SBERT 반영됨

---

## Swagger
- URL: `http://localhost:${PORT}/api-docs` (기본 4000)
- 태그: Recommendations, Admin/Ingest, Movies 등

---

## 체크리스트(프론트)
- [ ] `partial=true` 처리(스피너/토스트 + 자동 재조회/잡 폴링)
- [ ] `reasons` 일부를 카드에 설명으로 노출(예: "장르 2개 일치 · 평점 8.7")
- [ ] 피드백 후 즉시 `GET /v1/reco/personal` 재호출
- [ ] 크레딧 이미지 URL 빌더 적용
- [ ] 빈 결과/에러 fallback UI 적용

