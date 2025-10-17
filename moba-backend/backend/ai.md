# TMDB 기반 영화 추천 시스템 설계서 — 입력 데이터 & 학습 단계

> 목적: TMDB API 데이터와 사용자의 명시적/암묵적 선호를 이용해 **정확도와 성능**을 모두 고려한 추천 시스템을 구현한다. 본 문서는 **입력 데이터 스키마**와 **학습·서빙 단계**를 단계별로 정의한다.

---

## 0. 용어 정의

* **후보군(Candidate Pool)**: 장르/필터로 1차 수집된 영화 집합
* **임베딩(Embedding)**: 문장/장르/키워드 등을 고정 길이 벡터로 표현한 결과
* **Re-ranking**: 후보군을 더 정교한 점수로 재정렬하는 단계

---

## 1. 전체 흐름(High-level Pipeline)

1. 사용자 온보딩: 선호 **장르**(N개) 선택
2. 후보군 생성: TMDB `discover` API로 장르 기반 영화 수집
3. 사용자 피드백: 후보군에서 **좋아하는 영화** K개 선택(명시적 피드백)
4. 특징 추출: TMDB 메타(장르/키워드/개요/출연/감독) → 임베딩/벡터화
5. 사용자 프로필 벡터 생성: 선택 영화 임베딩의 **평균(or 가중 평균)**
6. 유사도 점수 계산: 사용자 벡터 ↔ 전체 영화 벡터 **코사인 유사도**
7. Re-ranking: 인기도/평점/신작 보정, 노출 다양성 반영
8. 추천 결과 서빙: 상위 N개 반환, 로그 수집(클릭/좋아요/시청)
9. 주기적(또는 이벤트 기반) 재학습: 벡터/가중치/규칙 업데이트

---

## 2. 입력 데이터 스키마(정의 & 예시)

### 2.1 사용자 입력(User Profile)

**필수**

```json
{
  "userId": "u_12345",
  "favoriteGenres": [28, 878, 53],
  "selectedFromCandidates": [603, 27205, 157336],
  "timestamp": "2025-10-17T06:00:00Z"
}
```

* `favoriteGenres`: TMDB 장르 ID 배열(예: 28=Action, 878=Sci-Fi, 53=Thriller)
* `selectedFromCandidates`: 후보군 중 사용자가 좋아요/선택한 영화 ID 리스트(K개)

**선택(고도화용)**

```json
{
  "favoritePeople": ["Christopher Nolan", "Keanu Reeves"],
  "favoriteKeywords": ["time travel", "dream", "hacker"],
  "ratings": {"603": 5, "27205": 4},
  "watchHistory": [
    {"movieId": 603, "watchedAt": "2025-10-12T12:00:00Z", "action": "completed"},
    {"movieId": 157336, "watchedAt": "2025-10-14T14:00:00Z", "action": "clicked"}
  ]
}
```

### 2.2 TMDB 영화 데이터(Movie Feature)

**정규화 스키마(저장용)**

```json
{
  "movieId": 603,
  "title": "The Matrix",
  "genres": [28, 878],
  "overview": "A computer hacker learns about the true nature of reality...",
  "keywords": ["virtual reality", "future", "hacker"],
  "cast": ["Keanu Reeves", "Laurence Fishburne"],
  "director": "Lana Wachowski",
  "voteAverage": 8.7,
  "popularity": 92.4,
  "releaseDate": "1999-03-31",
  "posterPath": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  "lastSyncedAt": "2025-10-17T05:00:00Z"
}
```

**필드 설명**

* `genres`: 장르 one/multi-hot 변환의 근거
* `overview`/`keywords`: TF-IDF 또는 Sentence-BERT 임베딩 입력
* `cast`/`director`: 텍스트 임베딩 병합 또는 one-hot/빈도 기반 보조 특징
* `voteAverage`/`popularity`/`releaseDate`: Re-ranking 가중치로 활용

---

## 3. 특징(Feature) 설계 & 벡터화

| 그룹           | 원천            | 전처리        | 표현(권장)                     | 비고              |
| ------------ | ------------- | ---------- | -------------------------- | --------------- |
| 장르           | 장르 ID         | 다중 원-핫     | multi-hot 벡터               | 간단/강력           |
| 개요(overview) | 텍스트           | 정규화, 언어 감지 | **Sentence-BERT** 384/768차 | 정확도 향상 핵심       |
| 키워드          | TMDB keywords | 소문자/스테밍    | TF-IDF or SBERT            | 데이터 가용성에 따라     |
| 출연/감독        | cast/director | 상위 N명 제한   | 빈도 임베딩 or SBERT            | 효과 좋음(감독/배우 선호) |
| 수치형          | 평점/인기도/연도     | 스케일링       | 실수형                        | Re-ranking 가중치  |

**임베딩 결합 전략**

* `movieEmbedding = concat(genreVec, sbert(overview), tfidf(keywords), sbert(cast+director))`
* 차원 축소(PCA/UMAP) 또는 선형 결합(가중 평균)로 최적화 가능

---

## 4. 학습/추천 단계(두 가지 경로)

### 4.1 경로 A — 콘텐츠 유사도 기반(빠른 구현, 높은 정확도)

1. **오프라인**: 모든 영화에 대해 임베딩 전처리 & 캐시(예: `movieId → vector`)
2. **온보딩**: 사용자가 후보군에서 고른 **K개 영화 임베딩 평균** → `userProfileVec`
3. **온라인 추론**: `cosine(userProfileVec, movieVec)` 상위 N개 반환
4. **Re-ranking**: `finalScore = α*similarity + β*popularity + γ*vote + δ*recency`
5. **로그 수집**: 클릭/좋아요/시청 → 다음 추천에 반영

**장점**: Cold Start에 강함, 설명 가능성 높음, 인프라 저렴
**확장**: 사용자 행동 로그가 쌓이면 4.2로 이행

### 4.2 경로 B — 하이브리드/신경망 기반(확장 단계)

* **LightFM/NeuralCF/DeepFM** 중 택1로 사용자-아이템 상호작용 학습
* 입력: `(userId, movieId, label)`

  * label: 좋아요/시청/완주(positive=1), 스킵/이탈(0)
* Side features: `userGenreVec`, `movieEmbedding`(장르+NLP) 함께 투입
* 목적함수: Binary Cross Entropy / BPR (Ranking) / Softmax CE
* 출력: `P(user likes movie)` → 상위 N개 랭크

**추천**: A로 시작 → 로그가 쌓이면 B 병행 → 최종 Re-ranking에 합성

---

## 5. 데이터 파이프라인(ETL & Job)

### 5.1 수집(Extraction)

* TMDB: `/genre/movie/list`, `/discover/movie`, `/movie/{id}`, `/movie/{id}/keywords`, `/movie/{id}/credits`
* 스케줄러: 매일/매주 동기화 (신작/트렌드 업데이트)

### 5.2 변환(Transformation)

* 텍스트 정규화(영문/국문 혼합 처리), 누락값 보정
* 키워드/인물 리스트 상위 N개 컷오프
* SBERT/TF-IDF 피처 생성, Redis/DB에 캐시

### 5.3 적재(Load)

* 메타: RDS(PostgreSQL) or MongoDB
* 벡터: 파일(HDF5/Parquet) + Redis(핫셋), 또는 벡터DB(선택)

---

## 6. 모델 & 파라미터(권장 기본값)

* SBERT: `sentence-transformers/all-MiniLM-L6-v2` (384차, 속도/정확도 균형)
* TF-IDF: `min_df=3`, `max_df=0.8`, `ngram=(1,2)`
* 유사도: Cosine (FAISS/Annoy로 근사탐색 선택 가능)
* Re-ranking 가중치: `α=0.7, β=0.15, γ=0.1, δ=0.05` (데이터에 맞춰 튜닝)
* 후보군 크기: 장르별 200~500편(페이지네이션 수집)
* 사용자 선택 K: 3~10편 추천(평균 5)

---

## 7. 평가(Offline & Online)

### 7.1 오프라인 지표

* **Recall@K, NDCG@K**: 상위 K개에 선호영화 포함 여부
* **MAP@K**: 전반적 랭킹 품질
* **Coverage/Diversity**: 다양성/장르 커버리지

### 7.2 온라인 지표(A/B 테스트)

* CTR(클릭률), Like Rate, Watch Completion Rate, Dwell Time
* 탐색-활용 균형: ε-greedy(예: ε=0.05)로 신작 탐색

---

## 8. API 설계(예시)

### 8.1 온보딩 — 선호 장르 저장

* `POST /v1/profile/genres`

```json
{ "userId": "u_12345", "favoriteGenres": [28, 878, 53] }
```

### 8.2 후보군 조회 — 장르 기반

* `GET /v1/reco/candidates?genres=28,878,53&page=1&size=50`

### 8.3 후보군 중 선호 영화 선택

* `POST /v1/profile/likes`

```json
{ "userId": "u_12345", "selectedFromCandidates": [603, 27205, 157336] }
```

### 8.4 추천 결과 조회

* `GET /v1/reco/personal?userId=u_12345&size=20`
* 응답: `{ movieId, title, posterPath, score, reasons }[]`

---

## 9. 저장소/테이블 설계(요약)

**movies**(movie_id PK, title, genres[], overview, keywords[], cast[], director, vote_avg, popularity, release_date, poster_path, last_synced_at)

**movie_vectors**(movie_id PK, genre_vec, overview_vec, keyword_vec, people_vec, updated_at)

**users**(user_id PK, created_at, ...)

**user_profile**(user_id PK, favorite_genres[], favorite_people[], favorite_keywords[])

**user_feedback**(user_id, movie_id, label[0/1], source[like/click/watch], ts)

**reco_logs**(user_id, movie_id, score, position, shown_at, interacted[0/1])

인덱스: `user_feedback(user_id, ts)`, `reco_logs(user_id, shown_at)`

---

## 10. 운영/성능 체크리스트

* 벡터 사전계산(오프라인) + Redis 핫셋 캐싱
* Near-Real-Time 업데이트: 사용자가 좋아요하면 즉시 `userProfileVec` 갱신
* 배치 스케줄: 메타/벡터 재계산(일 1회), 인기/트렌드(시간/일 단위)
* 근사 최근접 탐색(FAISS/Annoy)로 대용량 대응

---

## 11. 보안/프라이버시

* 최소 수집 원칙: userId, 장르/선호, 상호작용 로그
* 개인정보/민감정보 저장 금지(PII 분리/암호화)
* 로그 보존 기간 정책(예: 6~12개월) 및 삭제 API 제공

---

## 12. 비용 가이드

* 로컬/Colab SBERT + TF-IDF: 무료
* 소규모 서버(EC2 t3.small + Redis): 월 $5~10 수준
* 대규모/실시간: 벡터DB/FAISS 서버 + 오토스케일(비용 증가)

---

## 13. 구현 로드맵

1. **MVP**: 장르 기반 후보군 → 선택 영화 평균 임베딩 → 유사도 추천 + Re-ranking
2. **v2**: 클릭/시청 로그 수집 → LightFM/NeuralCF 도입(하이브리드)
3. **v3**: 세션 기반(BERT4Rec) + 다양성/탐색 정책 + 실시간 피드백 반영

---

## 14. 의사코드(핵심)

```pseudo
# 오프라인
for movie in TMDB_movies:
  genre_vec = multi_hot(movie.genres)
  overview_vec = SBERT(movie.overview)
  keyword_vec = TFIDF(movie.keywords)
  people_vec = SBERT(join(movie.cast[:5] + [movie.director]))
  movie_vec[movie.id] = concat(genre_vec, overview_vec, keyword_vec, people_vec)

# 온라인(사용자 요청)
user_vec = mean([movie_vec[m] for m in selectedFromCandidates])
scores = cosine_similarity(user_vec, movie_vec[all])
ranked = rerank(scores, popularity, vote, recency)
return topN(ranked)
```

---

### 부록 A. 장르 ID 예시(TMBD)

* Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36, Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, Science Fiction: 878, TV Movie: 10770, Thriller: 53, War: 10752, Western: 37

---

**끝.** 필요 시 본 문서를 기준으로 API 스펙/ERD/배치 잡 상세를 분리 문서로 확장합니다.
