# memoir field — data model (handoff)

현재 localStorage `memoir-field-v2` 키에 저장되는 단일 JSON 구조다.
Claude Code + Supabase 환경으로 옮기기 전 검토용 스키마.

---

## 1. 현재 localStorage 구조 (그대로)

```jsonc
{
  "admin": false,
  "onboarded": true,
  "mode": "project" | "wish" | "diary" | "note" | null,
  "trees": [ /* Tree */ ],
  "fallen": [ /* FallenEntry */ ]
}
```

### Tree
```ts
{
  id:    string;   // 't' + base36(ts) + 4-char rand. seed 데이터는 'p1','p2'…
  name:  string;   // ≤ 40 char
  year:  string;   // 'YYYY' — 빈 문자열 허용
  lead:  string;   // ≤ 24 char — 빈 문자열 허용
  desc:  string;   // ≤ 180 char
  x:     number;   // 월드 좌표 (meters, float)
  z:     number;   // 월드 좌표 (meters, float)
  seed:  number;   // uint32 — hashStr(name)에서 파생, tree 모양 결정
  memos: Memo[];
}
```

### Memo
```ts
{
  author: string;  // ≤ 32 char, 빈 값이면 'anon'으로 폴백
  text:   string;  // ≤ 180 char
  t:      number;  // unix ms
}
```

### FallenEntry
```ts
{
  id:       string;        // 'f' + base36(ts) + rand
  type:     'tree' | 'memo';
  fellAt:   number;        // unix ms — 30일 후 자동 purge
  parentTreeId?: string;   // type=='memo'인 경우에만
  snapshot: Tree | (Memo & { parentName: string; originalIdx: number });
}
```

---

## 2. 서버 모델 권장 스키마 (Supabase / Postgres)

ID 체계를 서버 기준으로 다시 깔아야 한다. 현재 클라이언트 ID는 마이그레이션 시 `legacy_id`로만 보관.

```sql
-- 사용자
create table users (
  id           uuid primary key default gen_random_uuid(),
  handle       text unique not null,           -- 'sohye'
  display_name text,
  created_at   timestamptz default now()
);

-- 필드 (한 user당 N개도 가능 — 'sohye/garden', 'sohye/notes' 식)
create table fields (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references users(id) on delete cascade,
  slug         text not null,                  -- 'memoir-field'
  title        text not null,                  -- 'memoir field'
  mode         text not null check (mode in ('project','wish','diary','note')),
  access       text not null default 'private' check (access in ('private','unlisted','public')),
  password_hash text,                          -- 옵션, bcrypt
  visitor_perm text not null default 'read'
               check (visitor_perm in ('read','memo','plant')),
  created_at   timestamptz default now(),
  unique (owner_id, slug)
);

-- 나무 (= 프로젝트)
create table trees (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid not null references fields(id) on delete cascade,
  -- field 내 정렬·표시 인덱스. 새 tree는 max+1.
  ord         int  not null,
  name        text not null,
  year        text,
  lead        text,
  desc        text,
  x           real not null,
  z           real not null,
  seed        bigint not null,                 -- 모양 결정
  state       text not null default 'living' check (state in ('living','withered')),
  withered_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index trees_field_living_idx on trees(field_id) where state='living';

-- 메모
create table memos (
  id          uuid primary key default gen_random_uuid(),
  tree_id     uuid not null references trees(id) on delete cascade,
  ord         int  not null,                   -- 가지 위 잎 순서
  author      text,                            -- nullable → 'anon'
  text        text not null,
  state       text not null default 'tied' check (state in ('tied','fallen')),
  fallen_at   timestamptz,
  created_at  timestamptz default now()
);
create index memos_tree_tied_idx on memos(tree_id) where state='tied';

-- (옵션) 동시성 충돌 회피용
create table tree_positions (
  tree_id uuid primary key references trees(id) on delete cascade,
  x real not null, z real not null
);
```

### 핵심 결정사항

1. **부드러운 삭제 (soft delete)** 가 모델의 1급 시민이다.  
   `trees.state='withered'`, `memos.state='fallen'` 으로 표시하고 30일 후 cron으로 영구 삭제.  
   → 현재 클라이언트의 `fallen` 배열을 별도 테이블로 두지 않고 같은 테이블 안에서 state 컬럼으로 관리.

2. **사람이 읽을 수 있는 URL 식별자**:  
   `app.com/{user.handle}/{field.slug}` → `app.com/sohye/memoir-field`  
   tree, memo 까지는 URL에 노출하지 않는다 (선택 후 ?t=, ?m= 쿼리).

3. **ord (순서) 컬럼**을 둬서 `state.trees`의 배열 순서를 보존한다.  
   client는 정렬·삽입 시 ord를 재할당해서 patch.

4. **x, z 좌표**는 그대로 real로 유지. 충돌 회피 로직은 클라이언트에서 처리.

5. **seed**는 bigint. `name`이 바뀌어도 seed는 유지해야 나무 모양이 안 바뀐다.  
   → 새 tree 생성 시 클라이언트가 `hashStr(name)` 결과를 그대로 전송.

---

## 3. 마이그레이션 체크리스트

- [ ] 현재 localStorage 구조 → 위 서버 스키마로 1회 import 스크립트
- [ ] `tree.id`, `memo.id` 모두 서버에서 uuid 재발급. 클라이언트는 legacy_id 매핑만 임시 보관.
- [ ] `mode`는 field 레벨로 승격 (현재는 state.mode 단일).
- [ ] 공유 설정(access, perm, password)은 share modal의 현재 UI와 1:1 매핑.
- [ ] `fallen` 30일 purge는 Supabase Edge Function cron으로.

---

## 4. 클라이언트 측 API 시그니처 (제안)

```ts
// fields
GET    /api/fields/:handle/:slug             // field + trees + memos (live만)
POST   /api/fields                           // 새 field 생성
PATCH  /api/fields/:id/share                 // access, perm, password

// trees
POST   /api/fields/:id/trees                 // {name, year, lead, desc, x, z, seed}
PATCH  /api/trees/:id                        // partial
POST   /api/trees/:id/wither                 // soft delete
POST   /api/trees/:id/lift                   // restore

// memos
POST   /api/trees/:id/memos                  // {author, text}
POST   /api/memos/:id/fall                   // soft delete
POST   /api/memos/:id/lift                   // restore

// fallen (휴지통)
GET    /api/fields/:id/fallen                // tree+memo 통합, 30일 이내
```

권한 검사는 모두 서버에서. 클라이언트는 응답에 들어있는 `caps: { canPlant, canMemo, canWither }`만 보고 UI를 토글.
