# 방명록 CRUD API 문서

방명록은 별도 백엔드 서버 없이, 클라이언트(`app.js`)가 Supabase의 자동 생성 REST API(PostgREST)를
`@supabase/supabase-js` 클라이언트로 직접 호출하는 구조다. 이 문서는 그 API 호출 규약을 정리한다.

## 공통 사항

- **Base URL**: `https://lqobhpktyrcfnbabadwa.supabase.co/rest/v1`
- **공통 헤더**
  | 헤더 | 값 |
  |---|---|
  | `apikey` | `window.SUPABASE_ANON_KEY` (publishable key) |
  | `Authorization` | `Bearer <같은 anon key>` |
  | `Content-Type` | `application/json` (쓰기 요청 시) |
  | `Prefer` | `return=representation` (생성/수정 결과를 응답 본문으로 받고 싶을 때) |
- **인증/권한**: 로그인 시스템이 없으므로 모든 요청은 anon 권한으로 이루어진다. RLS는 anon에게
  `entries`, `replies` 테이블의 SELECT/INSERT/UPDATE/DELETE를 모두 허용한다 (`docs/requirements.md` §3, §6 참고).
  **비밀번호 검증은 이 API 레벨이 아니라 클라이언트 앱(`app.js`)에서 수행**한다 — 즉 이 API 자체는
  누가 호출하든 항상 수정/삭제를 허용하며, "본인 확인"은 UI가 bcrypt 해시를 비교해 통제하는 애플리케이션
  규약일 뿐 DB가 강제하지 않는다.
- **실제 호출 방식**: `app.js`는 supabase-js를 통해 아래 REST 엔드포인트를 감싸서 호출한다
  (예: `sb.from('entries').select('*')`). 아래 표의 URL/메서드는 supabase-js가 내부적으로 만드는
  실제 HTTP 요청 기준이다.

## 1. 글 (entries)

### 1.1 목록 조회 — `GET /entries`

최신순으로 전체 글을 가져온다.

```
GET /entries?select=*&order=created_at.desc
```

**응답 예시**
```json
[
  {
    "id": "18f39988-0d7b-4e10-a735-1c7d6963f0cd",
    "author_name": "테스트유저",
    "content": "안녕하세요! 방명록 테스트입니다.",
    "password_hash": "$2a$10$...",
    "created_at": "2026-08-08T00:47:00+00:00",
    "updated_at": null
  }
]
```
> `password_hash`는 응답에 포함되지만 UI에는 절대 노출하지 않는다. 값 자체는 bcrypt 해시라
> 원문 비밀번호로 역산할 수 없다.

### 1.2 글 작성 — `POST /entries`

```
POST /entries
Content-Type: application/json
Prefer: return=representation
```
```json
{
  "author_name": "테스트유저",
  "content": "안녕하세요! 방명록 테스트입니다.",
  "password_hash": "$2a$10$..."   // 클라이언트에서 bcrypt.hashSync(password, 10)로 생성
}
```
`id`, `created_at`은 DB가 자동 생성한다 (`updated_at`은 최초 작성 시 `null`).

### 1.3 글 수정 — `PATCH /entries?id=eq.{id}`

클라이언트가 입력받은 비밀번호를 `password_hash`와 bcrypt로 먼저 비교해 통과한 경우에만 호출한다.

```
PATCH /entries?id=eq.18f39988-0d7b-4e10-a735-1c7d6963f0cd
```
```json
{
  "author_name": "수정된이름",
  "content": "수정된 내용입니다.",
  "updated_at": "2026-08-08T01:00:00.000Z"
}
```

### 1.4 글 삭제 — `DELETE /entries?id=eq.{id}`

```
DELETE /entries?id=eq.18f39988-0d7b-4e10-a735-1c7d6963f0cd
```
`replies` 테이블이 `entry_id → entries.id`에 `ON DELETE CASCADE`로 걸려 있어, 글을 지우면
해당 글의 답글도 DB가 자동으로 함께 삭제한다.

## 2. 답글 (replies)

구조는 entries와 동일하고, `entry_id`로 원글을 참조한다. 답글은 1단계까지만 허용되므로
`replies`에는 부모 답글을 가리키는 컬럼이 없다.

### 2.1 특정 글의 답글 목록 조회 — `GET /replies`

```
GET /replies?select=*&entry_id=eq.{entryId}&order=created_at.asc
```

앱은 초기 로딩 시 전체 답글을 한 번에 가져와 `entry_id` 기준으로 그룹핑한다:
```
GET /replies?select=*&order=created_at.asc
```

### 2.2 답글 작성 — `POST /replies`

```json
{
  "entry_id": "18f39988-0d7b-4e10-a735-1c7d6963f0cd",
  "author_name": "답글유저",
  "content": "반가워요! 답글 테스트입니다.",
  "password_hash": "$2a$10$..."
}
```

### 2.3 답글 수정 — `PATCH /replies?id=eq.{replyId}`

```json
{
  "author_name": "수정된답글유저",
  "content": "수정된 답글 내용",
  "updated_at": "2026-08-08T01:05:00.000Z"
}
```

### 2.4 답글 삭제 — `DELETE /replies?id=eq.{replyId}`

```
DELETE /replies?id=eq.{replyId}
```

## 3. 관리자 삭제

관리자 기능은 별도 API가 아니다. `app.js`가 마스터 비밀번호를 bcrypt로 검증해 `isAdmin`이
참이면, 1.4/2.4의 동일한 `DELETE` 요청을 (비밀번호 프롬프트 없이) 그대로 호출한다.
관리자 모드는 서버가 아니라 브라우저 `sessionStorage`가 들고 있는 클라이언트 상태다.

## 4. 에러 응답

PostgREST 표준 에러 형식을 그대로 받는다.

```json
{
  "code": "22P02",
  "details": null,
  "hint": null,
  "message": "invalid input syntax for type uuid: \"\""
}
```

| 상황 | 코드/증상 |
|---|---|
| 잘못된 UUID | `22P02 invalid input syntax for type uuid` |
| 필수 컬럼 누락 | `23502 null value in column ... violates not-null constraint` |
| 존재하지 않는 `entry_id` 참조 | `23503 insert or update ... violates foreign key constraint` |

## 5. 데이터 모델 참고

테이블 스키마 원본은 `docs/requirements.md` §4를 따른다. 요약:

| 테이블 | 컬럼 |
|---|---|
| `entries` | `id`(uuid, PK), `author_name`(text), `content`(text), `password_hash`(text), `created_at`(timestamptz), `updated_at`(timestamptz, null 가능) |
| `replies` | `id`(uuid, PK), `entry_id`(uuid, FK→entries.id, `ON DELETE CASCADE`), `author_name`(text), `content`(text), `password_hash`(text), `created_at`(timestamptz), `updated_at`(timestamptz, null 가능) |
