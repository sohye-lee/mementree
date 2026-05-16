# Questions for review

Built overnight (Phase E + F): memos (composer, list, 3D leaves), wither / let-fall, recently-fallen tray, hint bar. Things below are functional or design judgment calls that deserve your eyes before they get baked in.

---

## Functional decisions I made — please confirm

### 1. Wither = immediate removal, no fade animation
The design fades the tree out (gray + sink + tilt) over time before removing. In this build, calling `witherTree` flips the DB state and the next `router.refresh()` removes the tree from the scene — no animation.
- **Why:** preserving the animation needs an optimistic client-side phase (start animation → wait → call server → revalidate), which I didn't want to risk without your sign-off.
- **Question:** add the fade animation, or keep instant?

### 2. "Let memo fall" — same instant removal
Same shape as above. Memo disappears from panel + 3D scene the moment the action revalidates. Original design had a "falling paper" animation (`spawnFallingPaper`) that I didn't port.
- **Question:** add the falling paper, or keep instant?

### 3. Memo composer default author = user's display_name / handle
The design's composer placeholder is `your name` and is editable (visitors can sign with whatever). In v1 you're the only keeper, so I pre-fill it with your `display_name` (or `handle` as fallback). You can edit per-memo.
- **Question:** keep prefilled? or empty by default and let you type each time?

### 4. Hint bar auto-dismisses on first WASD
I made the keyboard-hint bar disappear permanently (via `localStorage`) the first time you press a movement key, so it doesn't linger. Design has it always-on.
- **Question:** is auto-dismiss right, or do you want it always visible?

### 5. Fallen tray button placement
Added a `↓ fallen` button in the top nav (right side, next to sign-out) with a small count badge when items exist. The design had a similar `.role-toggle.fallen` button. Counts include both withered trees and fallen memos.
- **Question:** placement OK? badge style OK?

### 6. Memo character counter shows remaining
I used `180 - text.length chars` (counts down). Design's `memo-count-rem` does the same.
- **Question:** keep `180 chars` style? Or `0 / 180`?

### 7. Memos in panel are read-only after creation
No edit-in-place yet. You can only let memos fall (soft delete) or restore from the tray. The design also has no inline edit, so this matches.
- **Question:** is "no edit, only delete + restore" OK as v1, or should memo edit be added?

---

## Known limitations / explicitly deferred

### Tree fade animation on wither (see #1)
### Memo falling-paper animation (see #2)

### Ambient sound (design's setupAudio)
Skipped entirely. Original design has wind + rustle ambient with mute/unmute toggle. Adds complexity and autoplay-policy handling.
- Resurrect later? It would go in the bottom-right near the FAB.

### Index panel (left side tree list)
Skipped. Design has `<aside class="index-panel">` listing all trees with "+ plant" inline. You can navigate trees by clicking them in the 3D scene, which I think is sufficient for v1.
- Resurrect later if the field gets crowded?

### Memo viewer fullscreen reader
The design has a separate `<aside class="memo-view">` for reading a single memo fullscreen with prev/next nav. I skipped — the memos render in the detail panel and you read them there.
- Worth adding for long memos?

### Toast system
Original `toast('planted · {name}')`-style notifications aren't here. Modal closes, scene updates — the user sees the effect directly, but no explicit acknowledgment.
- Skipped per "voice.md says minimal feedback." Worth adding?

### Custom cursor (cursor: none + custom indicator)
Skipped. Original design replaces native cursor with a small custom one. Distracting on hybrid devices (the design's own review notes call this out).

### 30-day automatic purge of fallen items
Schema supports it (`withered_at`, `fallen_at`), but I haven't built the cron / edge function. Items will stay in `state='fallen'` indefinitely until you do this.
- This needs a Supabase Edge Function with a cron schedule. Worth doing soon if you plan to keep planting/withering during testing.

### Environment system (sun cycle + weather)
Still not built. The bottom env footer (`season · phase · NN trees · NN memos`) is not rendered. See `project_mementree_environment.md` in your memory.

### Visitor / sharing / permissions
v2 scope. Schema supports `access`, `visitor_perm`, `password_hash` — UI not built.

---

## Possible bugs I'd like you to sanity-check

### Memo positions on a tree may shift when a memo is fallen
Reason: memo positions are assigned by index (`pickTipForMemo(treeId, idx)`). When memo at index 2 falls, memo at index 3 becomes index 2 and moves to a different branch tip. Visually: surviving memos may "jump" to new branches.
- **Mitigation idea:** key tip assignment by `memo.id` hash instead of array index. Stable across deletions. Want me to fix?

### Camera resets to default on first plant ONLY if firstTime was true
After the first plant, the scene no longer recreates (incremental updates kicked in from Phase D). But for the very first plant, the field goes from `firstTime=true` to `false` and the component tree re-renders. The 3D canvas itself doesn't unmount (same key), so camera should preserve. **Please verify this works** — if camera snaps back on first plant, I'll need to think harder.

### Touch on bottom sheet
When the detail panel is open as a bottom sheet on mobile, scrolling inside it should work. The 3D canvas is behind it with `touchstart/move/end` listeners on `canvas`. Bottom sheet's touches target the sheet's DOM, not the canvas, so they should be unaffected. **Please verify on mobile** — if drag-to-look fires from bottom sheet touches, I'll add an additional target check.

---

## Style nits I'm not sure about

### "Wither" button in panel head is plain text "↓ wither"
No background, just hover color → red. Could be a more obvious button. The design uses a simple text-link too, so I followed.

### Confirm modal buttons: "keep it" / "let it fall"
Voice.md tone, matches design. Confirm button hovers to red.

### Fallen tray empty state copy
`nothing fallen yet.\nwhen you let a tree wither or a memo fall, it rests here for thirty days.` — wrote this myself in voice.md tone. Original had a leaf glyph that I didn't include.

### Mobile bottom sheet height
Set to `70vh max 85vh`. May feel small/large depending on content. Easy to tune.
