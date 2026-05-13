# memoir field — voice & copy guide

이 파일은 Claude Code 환경에서 디자인 일관성을 유지하기 위한 기준점.
새 화면·새 상태·새 토스트를 추가할 때 이 문서의 톤을 따라 쓰면 된다.

---

## 1. 톤의 한 줄 정의

> **메모는 잎사귀처럼 가볍게, 안내는 정원사처럼 조용히.**

- 시적이지만 감상적이지 않다.
- 영어이지만 한국어처럼 짧고 끊어 친다.
- 명령형보다 권유형. 강조보다 여백.
- 항상 소문자. 마침표는 쓰되 느낌표는 거의 쓰지 않는다.

---

## 2. 핵심 어휘 (lexicon)

| 쓰는 단어 | 쓰지 않는 단어 | 왜 |
|---|---|---|
| field | workspace, page, board | 우리는 정원에 있다 |
| tree | project, item, card | 메타포 일관성 |
| memo | note, comment, post | 짧은 것을 매다는 행위 |
| tie a memo | post / submit / add | "tie"가 정원 메타포 |
| plant | create / add / new | tree의 동사형 |
| wither | delete / archive | tree의 소멸 |
| let fall | delete | memo의 소멸 |
| fallen | trash / deleted | 보관된 상태 |
| lift back up | restore / recover | 복구 |
| turn to soil | permanently delete | 30일 후 영구 삭제 |
| keeper | owner, admin | field의 주인 |
| visitor | viewer, guest | 보러 온 사람 |
| the field grows | (없음) | 시간 경과의 시적 표현 |

---

## 3. 빈 상태 (empty state) 공식

> **상태 묘사 1줄 → 시간 또는 조건 1줄 → 작은 행동 1줄(선택).**

예시:
- "this field is still empty. / come back soon — / something will grow here."
- "nothing has fallen here yet. / memos and trees you let go will rest here / for thirty days before turning to soil."

❌ 피해야 할 패턴:
- "No items yet" — 너무 사무적
- "Get started by clicking…" — 명령형
- "🌱 Let's plant your first tree!" — 이모지·느낌표·강요

---

## 4. 토스트 (toast)

- 항상 소문자, 6단어 이내.
- 형식: `[동사 과거형] · [대상]`
- 예: `planted · river walk` / `memo tied · river walk` / `tree restored`

피드백 없이 끝나는 액션은 없어야 한다. 단, 토스트가 두 번 이상 연달아 뜨지 않도록 한 흐름당 하나로.

---

## 5. 모달 안내문 (modal copy)

- 첫 줄은 **무엇을 하는 모달인지**, 두 번째 줄은 **그래서 사용자가 뭘 하면 되는지**.
- 길이는 두 줄을 넘기지 않는다.
- 예: 
  > "a tree is a project. once planted, the team can tie memos to its branches."

---

## 6. 확인 모달 (destructive)

"정말 삭제하시겠습니까?" 같은 직선적인 표현은 쓰지 않는다.

- 제목: `let this go?` / `let this memo fall?`
- 본문: 30일 보관 + 이후 영구 삭제임을 시적으로 안내.
- 버튼: `keep it` (취소) / `let it fall` (삭제)

---

## 7. 권한·접근 (share modal)

- "private — only me / unlisted — anyone with the link / public — anyone can find it"
- "just read / tie memos to existing trees / plant trees too"

권한 단계의 desc는 항상 "사용자가 무엇을 할 수 있는지"를 1인칭 풍경으로 묘사한다.
> "visitors walk and read. no marks left behind."

---

## 8. 환경 (env footer)

- season: `spring / summer / autumn / winter` (소문자)
- phase:  `dawn / morning / afternoon / dusk / night` (소문자)
- stats: `01 tree · 02 memos` 형식 (zero-pad 2자리)

---

## 9. 시간·날짜

- 상대시간 우선: `2 days ago` / `just now` / `last week`
- 절대시간이 필요할 때만: `2025·08·14`
- 24시간제, 콜론 구분: `14:32 KST`

---

## 10. 시각 톤과의 매핑

| 시각 | 카피 |
|---|---|
| paper · grain · soft shadow | 부드러운 절제된 문장 |
| monospace 타이포 | 짧고 호흡이 끊어진 문장 |
| 흑·종이·민트·붉음 4색만 | 의미를 색에 위임 — 글로 보충하지 않는다 |
| 빈 여백을 두려워하지 않는 레이아웃 | 빈 여백을 두려워하지 않는 카피 |

---

## 11. 자주 쓰는 문장 패턴

- "a small X." — 무언가를 소개할 때
- "you can ~, ask the keeper if you'd like to ~" — 권한이 부족한 안내
- "keep it small." — 입력 placeholder
- "no marks left behind." — 읽기 전용 모드
- "the field grows with you." — 온보딩 마무리
