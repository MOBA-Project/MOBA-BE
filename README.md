
# 🎬 MOVA Backend (NestJS + MongoDB)

> **MOVA** — Movie Bookmark & Review App  
> 영화 검색, 북마크, 리뷰(댓글/대댓글), 커뮤니티, 개인화 추천을 제공하는 RESTful 백엔드 API  
> built with **NestJS**, **MongoDB**, and **TMDB API**

---

## 🧱 Tech Stack

| Layer | Stack |
|-------|--------|
| **Backend** | NestJS (TypeScript, Node.js) |
| **DB** | MongoDB (Mongoose ODM) |
| **Auth** | JWT + CSRF Protection |
| **API** | TMDB API |
| **Docs** | Swagger / OpenAPI |
| **Infra** | AWS EC2 |

---

## 📂 Structure

```

src/
├── movies/          # TMDB 프록시 (검색/상세/출연진)
├── auth/            # JWT 로그인/회원가입
├── bookmarks/       # 북마크/태그 관리
├── reviews/         # 리뷰 CRUD (좋아요/싫어요)
├── posts/           # 커뮤니티 게시글/댓글
├── reco/            # 개인화 추천 시스템
└── common/          # 유틸리티, 가드, 필터

````

---

## ⚙️ Setup

1️⃣ **Clone & Install**

```bash
git clone https://github.com/MOVA-Team/mova-backend.git
cd mova-backend/backend
npm install
````

2️⃣ **Set Environment**

`.env` 파일을 생성하세요.

```bash
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=yourSecretKey
TMDB_API_KEY=your_tmdb_key
```

3️⃣ **Run Server**

```bash
npm run start:dev
```

📚 Swagger UI → [http://localhost:4000/api-docs](http://localhost:4000/api-docs)

---

## 🔐 Core APIs

| Domain         | Description         |
| -------------- | ------------------- |
| **/auth**      | 회원가입 · 로그인 · 토큰 재발급 |
| **/movies**    | 영화 검색 · 상세 · 출연진 정보 |
| **/bookmarks** | 영화 북마크 및 태그 관리      |
| **/reviews**   | 리뷰 CRUD + 댓글/대댓글    |
| **/posts**     | 커뮤니티 게시글/댓글         |
| **/v1/reco**   | 개인화 추천 (장르/선호 기반)   |

> ✅ 모든 엔드포인트는 Swagger UI에서 테스트 가능

---

## 🧩 Module Status

| Module    | Status |
| --------- | ------ |
| Movies    | ✅ Done |
| Auth      | ✅ Done |
| Bookmarks | ✅ Done |
| Reviews   | ✅ Done |
| Posts     | ✅ Done |
| Reco      | ✅ Done |

---

## 🧠 Highlights

* **TMDB API 통합** — 영화 검색/상세/출연진 데이터
* **JWT + CSRF 보호** — 안전한 인증 구조
* **북마크/리뷰/커뮤니티 통합 도메인**
* **개인화 추천 시스템** — 사용자 선호 기반 추천
* **Swagger Docs + Layered Architecture**

---

## 🧰 Commands

| Command           | Description      |
| ----------------- | ---------------- |
| npm run start:dev | Development mode |
| npm run build     | Build TypeScript |
| npm run test      | Unit tests       |
| npm run lint      | Lint check       |

---

## 🌐 Example

```bash
curl "http://localhost:4000/movies/search?query=인셉션"
```


## 🧾 Docs

📚 **API Docs:** [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
🌍 **TMDB API:** [https://developer.themoviedb.org](https://developer.themoviedb.org)
