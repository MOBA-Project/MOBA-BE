
# 🎬 MOBA Backend (NestJS + MongoDB)

> **MOBA** — Movie Bookmark & Review App
> 영화 검색, 북마크, 리뷰(댓글/대댓글) 기능을 제공하는 RESTful 백엔드 API
> built with **NestJS**, **MongoDB (Mongoose)**, and **TMDB API**

---

## 🧱 Tech Stack

| Layer                 | Stack                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| **Backend Framework** | [NestJS](https://nestjs.com/) (Node.js, TypeScript)                          |
| **Database**          | MongoDB (Atlas) + Mongoose ODM                                               |
| **Auth**              | JWT (Access Token)                                                           |
| **External API**      | [TMDB API](https://developer.themoviedb.org/reference/intro/getting-started) |
| **Environment**       | dotenv (.env)                                                                |
| **Package Manager**   | npm                                                                          |
| **Infra (예정)**        | AWS EC2 / Docker / Render (개발 환경)                                            |

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── movies/              # TMDB 프록시 (검색, 상세, 예고편, 장르)
│   ├── auth/                # (예정) JWT 기반 로그인/회원가입
│   ├── users/               # (예정) User 스키마 및 정보 관리
│   ├── reviews/             # (예정) 리뷰 및 대댓글 CRUD
│   └── bookmarks/           # (예정) 영화 북마크 CRUD
├── .env                     # 환경 변수 (Git에 업로드 금지)
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

`.env` 파일 예시 

> ⚠️ `.env`는 `.gitignore`에 포함되어야 합니다.

```bash
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/moba
JWT_SECRET=mySuperSecretKey
TMDB_API_KEY=<your_tmdb_api_key>
```

---

## 🚀 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/MOBA-Project/MOBA-BE.git
cd MOBA-BE/backend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Development Server

```bash
npm run start:dev
```

서버가 실행되면 콘솔에 👇

```
[Nest] Application is running on: http://localhost:4000
```

---

## 🎬 Movies API Overview

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/movies`               | 영화 목록 (장르, 페이지네이션) |
| `GET`  | `/movies/:id`           | 영화 상세              |
| `GET`  | `/movies/:id/videos`    | 영화 예고편             |
| `GET`  | `/movies/search?query=` | 영화 검색 (한글→영문 폴백)   |

### Example

```
GET /movies?page=1&genre=action
GET /movies/550
GET /movies/550/videos
GET /movies/search?query=컨저링
```

---

## 🧩 Modules (진행 상황)

| Module              | Description         |  Status  |
| ------------------- | ------------------- | :------: |
| 🎬 `MoviesModule`   | TMDB 연동 (검색/상세/비디오) |   ✅ 완료   |
| 🔐 `AuthModule`     | JWT 회원가입/로그인        | 🚧 진행 예정 |
| 👤 `UsersModule`    | 사용자 스키마 관리          |   🚧 예정  |
| 💬 `ReviewsModule`  | 댓글/대댓글 기반 리뷰        |   🚧 예정  |
| ⭐ `BookmarksModule` | 영화 북마크              |   🚧 예정  |

---

## 🧠 API Design Principle

* **Layered Architecture**
  Controller → Service → (Repository or External API)
* **RESTful Convention**
  `/movies`, `/reviews`, `/auth`
* **Separation of Concerns**
  각 도메인은 독립 모듈로 구성 (`movies`, `auth`, `users`, `reviews`)
* **Error Handling**
  NestJS `HttpException` 기반 통합 처리
* **Scalability**
  모듈 단위 확장 및 Mongoose Schema 중심 DB 설계

---

## 🧾 Example Response

```json
{
  "page": 1,
  "results": [
    {
      "id": 550,
      "title": "Fight Club",
      "poster_path": "/a26cQPRhJPX6GbWfQbvZdrrp9j9.jpg",
      "overview": "The first rule of Fight Club is...",
      "release_date": "1999-10-15",
      "vote_average": 8.4
    }
  ],
  "total_pages": 500,
  "total_results": 10000
}
```

---

## 🧰 Development Commands

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `npm run start`     | Start in production mode         |
| `npm run start:dev` | Start in watch mode              |
| `npm run build`     | Compile TypeScript to JavaScript |
| `npm run lint`      | Lint check                       |

---


👉 **정리 한 줄**

> 이 README는 현재 Movies 모듈 중심으로 작성되어 있고,
> 이후 Auth, Reviews, Bookmarks 기능이 추가될 때 섹션을 업데이트하면 됩니다.

