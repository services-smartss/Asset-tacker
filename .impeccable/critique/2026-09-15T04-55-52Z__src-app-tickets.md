---
target: src/app/tickets
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/narapat/Documents/GitHub/asset-tracker/src/app/tickets"
timestamp: 2026-09-15T04-55-52Z
slug: src-app-tickets
---
Method: dual-agent (A: 49eb9973-cfda-4deb-b867-91a34f82ad3d · B: e5c72867-cc1f-4008-a111-c9cb9e8af7d1)

Target: `src/app/tickets` (Operate helpdesk inbox, GLPI-style timeline + actors)

# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Toasts exist; first Answer silently auto-assigns and flips status to Processing; Solution silently sets Solved; actor Selects PATCH with no pending/undo. |
| 2 | Match System / Real World | 2 | “Actors & fields”, Incident/Request, Answer vs Follow-up vs Solution are ITSM jargon; picker says “asset” while the field says “Item”; member subtitle still says “assign”. |
| 3 | User Control and Freedom | 2 | Cancel on create and mobile Back exist; every actor field and Solution commit with no undo; no clear-all on queue + status + priority. |
| 4 | Consistency and Standards | 1 | Three UIs: Operate inbox, `/admin/tickets` Kanban + Comments modal, leftover user list statuses (`in_progress` / `completed`). Rainbow pills vs DESIGN.md ink/paper. Multiple filled primaries. |
| 5 | Error Prevention | 2 | Title required, empty composer disabled; Solution auto-solves with no confirm; six instant-save dropdowns invite misclick; asset unlink is a ghost X. |
| 6 | Recognition Rather Than Recall | 2 | Asset tag/name absent from the inbox row; Incident vs Request and Answer vs Solution unexplained; Board is a second mental model. |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, no Cmd-Enter, no j/k queue, no bulk; list is a stack of buttons not a listbox; Kanban is pointer-drag only. |
| 8 | Aesthetic and Minimalist Design | 2 | Equal-weight rainbow chips, Ticket icon on the h1, queue + search + two filters + Board + New Ticket + stacked create form; selected row is `bg-muted`, not ink. |
| 9 | Error Recovery | 2 | Generic “Failed to update/create ticket”; asset search failure empties the list with “No assets found”; no retry, no field-level errors. |
| 10 | Help and Documentation | 1 | No contextual hint on Type, Solution, or auto-assign; Help lives in Tools and does not teach this flow. |
| **Total** | | **17/40** | **Poor** |

Cognitive load: **7 / 8 checklist failures** (passed grouping only). Critical.

# Design Specificity Verdict

**Category-interchangeable**, with one thin Asset Tracker hook.

**LLM assessment:** The split inbox + timeline + “Actors & fields” panel is a GLPI/Zammad helpdesk composition. Swap AssetPicker for “Customer” and this is any SaaS ticket queue. Night-shift console signals (ink selected states, tabular fleet language, one primary, paper work surface) are not authored here. What is product-specific — linking a tagged asset — is buried in the detail rail and missing from the queue row, so the surface does not read as an IT asset console.

**Deterministic scan:** impeccable 4.0.0 `detect --json` on `src/app/tickets`, `src/app/user/tickets`, and `src/app/admin/tickets/ui` returned `[]` / exit 0 (0 findings). The detector did not catch leftover Tailwind rainbow chips (`bg-blue-100`, yellow, purple, green, sky, orange, gray) because those are not in the 60-rule set the same way purple gradients / Inter / nested cards are. Agreement: no classic AI-slop (no Inter, no purple-to-blue gradient, no nested cards). Disagreement: the LLM P1 on rainbow status chips is a brand-token miss the detector cannot see.

**Visual overlays:** No reliable user-visible overlay. Browser visualization failed: no local `.env` so no tickets server; Cursor browser tabs vanished before preflight mutation (`Browser view not found`). Production `https://asset-tacker.vercel.app/tickets` is a login wall. Overlay: **no**. Fallback: source review + CLI scan.

# Overall Impression

The Operate *shape* is right — queue on the left, conversation timeline, actors on the right — but the surface still feels like a generic helpdesk dropped into Asset Tracker. The single biggest opportunity is to make the **tagged asset** the thing you scan in the inbox, then close the incident against that asset, instead of triaging rainbow chips and ticket titles.

# What's Working

- Split inbox + opening/follow-up timeline + actors rail is the right Operate shape for queue work; better than a comments modal.
- `AssetPicker` (tag — name, search, clear) is the one authored product control; ticket-to-asset is why this exists.
- Empty state names the missing queue and offers **New Ticket**; create has Cancel; mobile detail has a labeled Back. Mono `#ticketNumber` is the one console-correct type move.

# Priority Issues

**[P1] Queue rows hide the asset.**
- **Why it matters:** Night-shift operators triage by which laptop, not ticket title. The product object lives only in the actors rail.
- **Fix:** Second line = `{assettag} — {assetname}` or “No item”; demote type/category pills.
- **Suggested command:** `/impeccable layout`

**[P1] Status/type/priority chips are leftover Tailwind rainbow; selection is not ink.**
- **Why it matters:** `bg-blue-100` / yellow / purple / green / sky / orange / gray + `rounded-full` fights DESIGN.md (ink `#1C1F24`, paper, semantic danger/success/warning/info only). Selected row `bg-muted` is not the nav’s ink fill.
- **Fix:** Map New→info, Processing→warning, Solved→success, Closed→ink-soft, Incident→danger, Request→ink outline. Selected list item: ink fill + inverse text. Radius 8px, not pills.
- **Suggested command:** `/impeccable colorize`

**[P1] Three ticket products.**
- **Why it matters:** Operate detail vs Kanban `TicketModal` (“Comments”) vs leftover user list statuses (`In Progress` / `Completed`) trains two vocabularies. Board is a parallel app (`text-3xl font-bold` “Ticket Management”).
- **Fix:** Board opens `TicketDetailPanel`. Delete the comments-modal IA. One status vocabulary everywhere.
- **Suggested command:** `/impeccable distill`

**[P2] Create and Solution are high-stakes with no scaffolding.**
- **Why it matters:** Form leads Type/Category before Title/Item; Incident/Request unlabeled. **New Ticket** is a filled primary beside shell Quick Create. Solution auto-sets Solved with no confirm. First Answer auto-assigns with no announcement.
- **Fix:** Title + Item first; type as a 2-segment control with one line of copy. Outline New Ticket when the queue exists. Solution CTA: “Mark solved” + confirm showing the asset. Toast: “Assigned to you · Processing.”
- **Suggested command:** `/impeccable clarify`

**[P2] Toolbar + actors dump every control at once.**
- **Why it matters:** 7 cognitive-load failures. Alex cannot go faster; Jordan cannot see the next click. Inbox chrome at once: queue (4) + New Ticket + Board + search + status (6) + priority (5). Actors rail: six editable decisions beside the composer.
- **Fix:** Default queue **Open**; collapse Status/Priority behind one “Filters” control; keep actors as view + Edit, or keep Status + Assignee always visible and nest the rest.
- **Suggested command:** `/impeccable quieter`

# Persona Red Flags

**Alex (power admin) — open / answer / solve:** No `j`/`k`, Enter, or `Cmd-Enter`. Tab walks every ticket button. No bulk close. Instant PATCH is fast but un-undoable. Asset missing from the row costs a click per ticket. Board is a detour that still opens a Comments modal. Silent auto-assign is useful only after he notices the dropdown moved. Solve is “Add solution,” not a close-the-incident command.

**Jordan (first-timer requester) — open / answer / solve:** Finds Tickets under Tools. H1 subtitle says “assign” though they cannot. Create asks Incident vs Request with no hint, then 7 categories, then “Select an asset.” After submit they land in an admin-shaped inbox. They can Follow-up but never Solution; no copy says a tech will reply. Filtered empty state (“Try a different queue or filter”) has no reset. Rainbow chips are an undecoded legend.

**Sam (keyboard / a11y) — open / answer / solve:** Search has placeholder only. Composer `<Textarea>` has no `<Label>`. List buttons lack `aria-selected` / `aria-current`; selection is color (`bg-muted`). Status meaning is chip color. Answer/Solution are two buttons, not a labelled radio. No `aria-live` beyond toasts for auto-assign / auto-solve. Kanban path is drag-only. Yellow-800 on yellow-100 chip pairs are AA risk vs ink-soft on paper.

# Minor Observations

- “ACTORS & FIELDS” uppercase tracking is GLPI chrome, not Operate voice.
- Breadcrumb Tickets + h1 Tickets + nav Tickets.
- DESIGN.md: no kicker/icon on the h1; Ticket icon violates it.
- `text-primary` “Open asset” vs ink buttons.
- Closed/low chips use `gray-*`; DESIGN.md forbids pure gray.
- Create form stacked above the split pane pushes the queue below the fold.
- Duplicate New Ticket in the empty state and the header.
- `/user/tickets` redirects to `/tickets`, but `UserTicketsPage` / `TicketList` / `TicketDetailsModal` still exist as a zombie IA.
- AssetPicker `aria-expanded` and clear `aria-label` are the a11y bright spots.

# Questions to Consider

- What if the inbox row *was* the asset, and the ticket was a note on it?
- Why can you Mark solved without offering “set this asset back to available”?
- If the model is GLPI, why keep a five-column Kanban that still says Comments?
- Should the only create path be shell Quick Create, so this page is queue-only?
- What would a 02:00 operator see first — Unassigned urgent hardware, or All + two filters?

# Live inspection

Attempted a new browser tab to `https://asset-tacker.vercel.app/tickets`. Tab bootstrap failed (blank tab, then navigation would not attach). URL is reachable as an unauthenticated login wall. No `.env`; did not start a local server. Critique is from source plus that login gate.
