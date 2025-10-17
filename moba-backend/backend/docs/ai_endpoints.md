# AI 추천 API 가이드

본 문서는 프론트엔드에서 영화 추천 UX를 구현하기 위한 엔드포인트 요약입니다. 경로 A(콘텐츠 기반)로 동작하며, TF‑IDF를 기본으로 사용하고 USE_SBERT=true 설정 시 SBERT 임베딩을 추가로 사용합니다.

## 빠른 흐름(UX 기준)
- 선호 장르 저장 → 개인 추천 호출 → 부분 결과면 3~5초 후 재호출 → 좋아요/싫어요 피드백 → 개인 추천 재호출
- 초기 품질 향상을 위해 관리자 시드(장르/페이지 단위 동기화)를 먼저 수행하면 응답이 더 빠르고 정확합니다.

## 공통 메타(meta)
일부 응답은 다음 메타 필드를 포함합니다.
- `partial`: true면 TMDB 폴백이 섞인 부분 결과(백그라운드 동기화 진행)
- `jobId`/`jobIds`: 백그라운드 동기화 잡 ID 목록
- `nextRefreshAfter`: 재요청 권장 시간(초)
- `source`: `local|fallback|mixed`

---

## 1) 선호 장르 저장
- Method/Path: POST `/v1/profile/genres`
- Body
```json
{ "userId": "u_123", "favoriteGenres": [28, 878, 53] }
```
- Response
```json
{ "userId": "u_123", "favoriteGenres": [28, 878, 53] }
```

## 2) 후보(장르 기반) 조회
- Method/Path: GET `/v1/reco/candidates?genres=28,878,53&page=1&size=20`
- Response
```json
{
  "items": [
    { "id": 603, "title": "The Matrix", "genre_ids": [28, 878], "overview": "...", "poster_path": "/...jpg", "popularity": 92.4, "vote_average": 8.7, "release_date": "1999-03-31" }
  ],
  "meta": { "source": "local", "partial": false }
}
```
- 주의: `meta.partial=true`일 경우 즉시 렌더 후 `nextRefreshAfter`초 뒤 재호출 또는 잡 상태 확인 후 재호출 권장.

## 3) 좋아요 후보 일괄 저장(선택)
- Method/Path: POST `/v1/profile/likes`
- Body
```json
{ "userId": "u_123", "selectedFromCandidates": [603, 27205, 157336] }
```
- Response
```json
{ "userId": "u_123", "likedMovieIds": [603, 27205, 157336] }
```

## 4) 개인 추천 조회(핵심)
- Method/Path: GET `/v1/reco/personal?userId=u_123&size=20`
- Response
```json
{
  "items": [
    { "movieId": 603, "title": "The Matrix", "posterPath": "/...jpg", "score": 0.91, "reasons": ["matchedGenres:2", "popularity:92.4", "vote:8.7", "recency:0.85", "tfidf:0.62", "sbert:0.71"] }
  ],
  "meta": { "partial": false, "source": "local" }
}
```
- Notes
  - `reasons`는 설명가능성 제공(장르/인기/평점/최신성/TF‑IDF/SBERT/neg/explore 등)
  - `partial=true`면 백그라운드 동기화 후 자동 새로고침 UX 권장

## 5) 피드백(좋아요/싫어요/클릭/완주)
- Method/Path: POST `/v1/reco/feedback`
- Body
```json
{ "userId": "u_123", "movieId": 603, "label": 1, "source": "like" }
```
- label: 1=positive(like/watch), 0=negative(skip)
- source: `like|click|watch|skip`
- Response: `{ "ok": true }`

## 6) 백그라운드 잡 상태 조회(옵션)
- Method/Path: GET `/v1/reco/jobs/:id`
- Response
```json
{ "id": "abc123", "status": "running", "updatedAt": 1730000000000 }
```
- status: `pending|running|completed|failed|not_found`

---

## 관리자(시드/온디맨드 동기화)
- 목적: 초기 카탈로그 확보 및 임베딩 사전계산(TF‑IDF, USE_SBERT=true일 때 SBERT 포함)

### 6-1) Discover 시드 동기화
- Method/Path: POST `/v1/admin/sync/discover?genres=28,878,53&pages=2`
- Response: `{ "ok": true }`
- 동작: TMDB discover → 상세/키워드/크레딧 수집 → Mongo upsert → 임베딩 저장

### 6-2) 단건 동기화
- Method/Path: POST `/v1/admin/sync/movie/:id`
- Response: `{ "movieId": 603, "title": "The Matrix" }`

---

## 환경 변수(요약)
- 필수: `MONGO_URI`, `TMDB_API_KEY`
- 추천 가중치/다양성: `RECO_ALPHA`, `RECO_BETA`, `RECO_GAMMA`, `RECO_DELTA`, `RECO_EPSILON`
- 블렌딩: `BLEND_TFIDF`, `BLEND_BASE`, `BLEND_SBERT`
- SBERT: `USE_SBERT=true|false`, `SBERT_MODEL`

## Swagger
- URL: `http://localhost:${PORT}/api-docs` (기본 4000)
- 태그: Recommendations, Admin/Ingest, Movies 등

## 권장 UX 패턴
- `meta.partial=true`면 즉시 렌더 + 3~5초 후 자동 재요청(또는 `/v1/reco/jobs/:id` 완료 확인 후 재요청)
- 좋아요/싫어요 이후 즉시 개인 추천 재호출로 “바로 반영됨” 체감 제공

