# 🎬 MOVA Backend (NestJS + MongoDB)

> **MOVA** — Movie Bookmark & Review App
> 영화 검색, 북마크, 리뷰(댓글/대댓글) 기능을 제공하는 RESTful 백엔드 API
> built with **NestJS**, **MongoDB (Mongoose)**, and **TMDB API**

---

## 🧱 Tech Stack

| Layer                 | Stack                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| **Backend Framework** | [NestJS](https://nestjs.com/) (Node.js, TypeScript)                          |
| **Database**          | MongoDB (Atlas) + Mongoose ODM                                               |
| **Auth**              | JWT (Access Token + Refresh Token) + CSRF Protection                        |
| **External API**      | [TMDB API](https://developer.themoviedb.org/reference/intro/getting-started) |
| **Documentation**     | Swagger/OpenAPI                                                              |
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
│   ├── auth/                # JWT 기반 로그인/회원가입/인증
│   │   ├── dto/             # Request/Response DTOs
│   │   ├── guards/          # JWT 인증 가드
│   │   ├── schemas/         # User 스키마
│   │   └── strategies/      # JWT 전략
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
JWT_ACCESS_SECRET=mySuperSecretAccessKey
JWT_REFRESH_SECRET=mySuperSecretRefreshKey
JWT_EXPIRES_IN=1h
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

### 3️⃣ Environment Setup

`.env` 파일을 생성하고 필요한 환경 변수를 설정하세요.

### 4️⃣ Run Development Server

```bash
npm run start:dev
```

서버가 실행되면 콘솔에 👇

```
[Nest] Application is running on: http://localhost:4000
```

### 5️⃣ API Documentation

Swagger UI: `http://localhost:4000/api-docs`

---

## 🔐 Auth API Overview

| Method | Endpoint                | Description        | Auth Required |
| ------ | ----------------------- | ------------------ | :-----------: |
| `POST` | `/auth/signup`          | 회원가입              | ❌            |
| `POST` | `/auth/login`           | 로그인 (JWT 발급)      | ❌            |
| `POST` | `/auth/refresh`         | Access Token 재발급   | ❌            |
| `POST` | `/auth/logout`          | 로그아웃              | ✅            |
| `GET`  | `/auth/protected`       | 인증 상태 확인         | ✅            |
| `POST` | `/auth/check-id`        | 아이디 중복 확인       | ❌            |
| `PUT`  | `/auth/update`          | 회원정보 수정         | ✅            |
| `DELETE` | `/auth/delete`        | 회원 탈퇴            | ✅            |

### Auth Features

- **JWT 기반 인증**: Access Token (1시간) + Refresh Token (14일)
- **CSRF 보호**: 더블 서브밋 토큰으로 CSRF 공격 방지
- **HttpOnly 쿠키**: Refresh Token을 안전하게 저장
- **비밀번호 암호화**: bcrypt를 사용한 해시 처리
- **아이디 중복 확인**: 실시간 아이디 사용 가능 여부 체크

---

## 🎬 Movies API Overview

| Method | Endpoint                | Description        | Auth Required |
| ------ | ----------------------- | ------------------ | :-----------: |
| `GET`  | `/movies`               | 영화 목록 (장르, 페이지네이션) | ❌            |
| `GET`  | `/movies/:id`           | 영화 상세              | ❌            |
| `GET`  | `/movies/:id/videos`    | 영화 예고편             | ❌            |
| `GET`  | `/movies/search?query=` | 영화 검색 (한글→영문 폴백)   | ❌            |

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
| 🔐 `AuthModule`     | JWT 회원가입/로그인/인증    |   ✅ 완료   |
| 👤 `UsersModule`    | 사용자 스키마 관리          |   🚧 예정  |
| 💬 `ReviewsModule`  | 댓글/대댓글 기반 리뷰        |   🚧 예정  |
| ⭐ `BookmarksModule` | 영화 북마크              |   🚧 예정  |

---

## 🧠 API Design Principle

* **Layered Architecture**
  Controller → Service → (Repository or External API)
* **RESTful Convention**
  `/movies`, `/auth`, `/reviews`, `/bookmarks`
* **Separation of Concerns**
  각 도메인은 독립 모듈로 구성 (`movies`, `auth`, `users`, `reviews`)
* **Error Handling**
  NestJS `HttpException` 기반 통합 처리
* **Security First**
  JWT 인증, CSRF 보호, 비밀번호 암호화
* **Scalability**
  모듈 단위 확장 및 Mongoose Schema 중심 DB 설계

---

## 🔒 Security Features

- **JWT 인증**: Access Token + Refresh Token 이중 구조
- **CSRF 보호**: 더블 서브밋 토큰으로 CSRF 공격 방지
- **HttpOnly 쿠키**: XSS 공격으로부터 Refresh Token 보호
- **비밀번호 암호화**: bcrypt 해시 알고리즘 사용
- **CORS 설정**: 허용된 도메인에서만 API 접근 가능
- **입력 검증**: class-validator를 통한 DTO 검증

---

## 🧾 Example Responses

### Auth Response

```json
// POST /auth/login
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": "user123",
  "nickname": "영화마니아"
}

// GET /auth/protected
{
  "message": "인증 성공",
  "id": "user123",
  "nickname": "영화마니아"
}
```

### Movies Response

```json
// GET /movies?page=1&genre=action
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
| `npm run test`      | Run unit tests                   |
| `npm run test:e2e`  | Run end-to-end tests             |

---

## 📝 API Testing

### 1. Swagger UI 사용
- `http://localhost:4000/api-docs`에서 인터랙티브 API 테스트

### 2. cURL 예시

```bash
# 회원가입
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"id":"testuser","password":"password123","nickname":"테스트유저"}'

# 로그인
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"testuser","password":"password123"}'

# 영화 검색
curl "http://localhost:4000/movies/search?query=인셉션"

# 인증이 필요한 API (JWT 토큰 필요)
curl -X GET http://localhost:4000/auth/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🚧 Roadmap

- [ ] **Reviews Module**: 영화 리뷰 및 댓글/대댓글 시스템
- [ ] **Bookmarks Module**: 영화 북마크 및 찜하기 기능
- [ ] **Users Module**: 사용자 프로필 및 설정 관리
- [ ] **Rate Limiting**: API 호출 제한 및 DDoS 방지
- [ ] **Caching**: Redis를 활용한 성능 최적화
- [ ] **File Upload**: 프로필 이미지 업로드 기능
- [ ] **Email Service**: 비밀번호 재설정 이메일 발송

---

👉 **정리 한 줄**

> 현재 Auth와 Movies 모듈이 완성되어 있으며, 
> 향후 Reviews, Bookmarks, Users 모듈이 추가될 예정입니다.
