# memoir field — 마지막 검수 메모

Claude Code로 이전하기 전, 디자인·UX 측면에서 직접 따라가본 결과.

---

## ✅ 정상 동작 확인

다음 흐름은 코드를 통해 따라가본 결과 모두 정상.

| 흐름 | 결과 |
|---|---|
| 첫 방문 → 온보딩 모달 자동 표시 | OK · 4가지 모드 선택 후 첫 나무 자동 식재 |
| 첫 나무 식재 → detail 패널 자동 열림 | OK |
| 메모 작성 → 입력 클리어 → toast | OK · `memo tied · {이름}` |
| 나무 wither → 30일 보관 → lift back up | OK · 위치·seed·메모 모두 복원 |
| visitor 토글 → admin 전용 컨트롤 숨김 | OK · `.admin-only` 일괄 처리 |
| 빈 필드(visitor) 진입 시 folded note | OK · 다른 카피로 분기 |
| share modal — access/perm/password 토글 | OK |
| ambient sound autoplay-policy 회피 | OK · 첫 클릭 후 풀림 |
| `localStorage` v2 키, fallen 30일 자동 purge | OK |
| 검색(search) — tree·memo 동시 매칭, 하이라이트 | OK |
| 모바일 breakpoint(≤760px) — bottom sheet, FAB, swipe nav | OK (코드 검증) |

---

## ⚠️ 자잘하지만 짚어둘 것 6개

Claude Code 옮긴 후 정리하면 좋은 항목들. **모두 디자인이 아니라 코드/QA 영역**이라 이 단계에서 픽스 안 함.

### 1. `memo`에 stable ID가 없다
현재 메모는 `{author, text, t}`만 갖고 인덱스로 식별 중. 서버로 가면 `memo.id`가 필요하다.  
→ `data-model.md`의 Postgres 스키마 참고. UUID 부여.

### 2. tree wither 후 lift 했을 때 동일 `tree.id` 재사용
로컬에서는 문제 없지만 서버에서 unique constraint와 충돌할 수 있음.  
→ 서버 단계에서는 `state` 컬럼으로 토글, ID 재사용 X.

### 3. `cursor: none`이 body 전체에 걸려 있음
터치 기기에서는 무해하지만, 하이브리드 기기(예: iPad+트랙패드)에서 커스텀 cursor의 mix-blend-mode 의존 때문에 잠깐 깜빡일 수 있음.  
→ `@media (hover: none) { body { cursor: auto } }` 한 줄 추가 권장.

### 4. visitor에게 비활성 `+ plant project` 버튼이 보임
`.idx-add[disabled]`로 점선 처리되지만 "왜 안 되는지" 안내가 없음.  
→ Claude Code에서는 visitor일 때 버튼 자체를 hide하거나, hover시 "ask the keeper" 툴팁.

### 5. `state.mode`가 field 전체에 단 하나
지금은 첫 나무를 심을 때 모드가 정해지고 그대로 굳음. 한 사용자가 여러 field를 가질 수 있게 하려면 mode를 field 레벨로 올려야 한다.  
→ 스키마에 이미 반영해둠.

### 6. three.js r159 deprecation warning
콘솔에 1건. 빌드 시점에 r160+로 올리면 ES module 마이그레이션 필요.  
→ Claude Code 환경 셋업할 때 같이 처리.

---

## 🌱 next steps — 권장 순서

1. **이 검수 결과 한 번 읽기** (지금)
2. **`handoff/voice.md`, `handoff/data-model.md`를 그대로 Claude Code 프로젝트로 복사**  
   → 컨벤션 + 데이터 모델이 처음부터 박힌 상태로 시작
3. **Claude Code에서 Next.js + Supabase 셋업**  
   - 인증: Supabase Auth (email link / OAuth)
   - DB: 위 스키마 그대로
   - 실시간: 다른 사람의 메모가 실시간으로 잎사귀로 매달리는 게 보이면 마법 같음
4. **3D 씬은 그대로 들고 가도 됨**  
   - `memoir-field.js`의 three.js 로직은 클라이언트 컴포넌트로 isolate  
   - tree/memo 데이터 소스만 props로 교체
5. **도메인 결정 → Vercel 배포 → 5명한테 링크 보내기**

---

## 🪴 미루는 게 옳은 것들

지금 만지면 시간만 쓰고 효과 적은 것들. Claude Code 단계에서 자연스럽게 해결됨.

- **3D 성능 (InstancedMesh 등)** — 나무 100그루 넘어가면 그때 진짜로 필요.
- **모바일 walk 컨트롤 (가상 조이스틱)** — 현재 swipe + tap으로 충분.
- **다국어** — 톤이 영어로 잡혀 있어서 굳이 지금 한국어 추가 X.
- **about / landing 페이지** — 도메인 + 시그니처 폰트 결정 후 한 호흡으로.

---

핸드오프 자료는 모두 `handoff/` 폴더에 정리:
- `voice.md` — 카피·보이스 가이드
- `data-model.md` — 클라이언트/서버 스키마
- `review-notes.md` — 이 문서
