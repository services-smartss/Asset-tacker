---
name: Asset Tracker
description: Operational IT asset console — ink primary, cool paper surfaces, Geist sans.
colors:
  ink: "#1C1F24"
  paper: "#FFFFFF"
  paper-muted: "#F4F5F6"
  ink-soft: "#7A7E87"
  line: "#E6E8EB"
  ink-inverse: "#FAFAFA"
  danger: "#EF4444"
  success: "#21C45A"
  warning: "#F59E0B"
  info: "#3B82F6"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  micro:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#2A2E35"
  nav-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
---

# Design System: Asset Tracker

## Overview

**Creative North Star: "The night-shift console."**

An Operate surface for people who already know what an asset is. The shell is a second, slightly cooler neutral than the work surface so the eye lands on counts and the next action, not on chrome. Brand lives in precise selected states, tabular numbers, and one primary create control — not in display type or decoration.

**Key Characteristics:**

- Geist sans at a tight product scale (1.125–1.2 steps); headings at 1.5rem semibold, not marketing clamp.
- Ink (`#1C1F24`) as primary fill for the thing you should do (Quick Create, current nav).
- Paper content pane; muted rail. Light is the default work scene (desk, fluorescent / window).
- Empty states name the missing object and offer a real route, never a hollow chart.

**The One Voice Rule.** One family, one ink, one radius family. Accent color is for primary action, current selection, and semantic status only.

## Colors

Restrained: neutrals plus ink. Semantic greens/ambers/reds for status, not decoration.

- **ink** `#1C1F24` — primary buttons, selected nav, headings.
- **paper** `#FFFFFF` — main work surface.
- **paper-muted** `#F4F5F6` — sidebar / rail.
- **ink-soft** `#7A7E87` — secondary text (must stay ≥4.5:1 on paper).
- **line** `#E6E8EB` — hairline borders.
- **danger / success / warning / info** — state vocabulary only.

**The Status Is Not Brand Rule.** Chart slices and status chips use the semantic set; they never restyle the shell.

## Typography

Fixed rem scale. Dashboard title is `text-2xl font-semibold tracking-tight`. Greeting and helper copy are `text-sm` muted. Fleet counts are `text-2xl` tabular-nums. No display serif, no fluid clamp on Operate pages.

**The Heading Carries Itself Rule.** No kicker or eyebrow above an h1.

## Layout

Sidebar 16rem (64px collapsed) + content. Dashboard content max-width 72rem, padding 1.25rem (2.5rem desktop). Tight groups inside a card; more space between greeting block, fleet strip, charts, map.

Empty map does not claim 420px. Charts without values do not match the height of a filled pie.

Mobile: bottom tab bar + sheet; 44px tap targets.

## Elevation & Depth

`--shadow-sm` and `--shadow-md` with offset and blur. No zero-offset glow. Cards use hairline border first; shadow only on hover-lift if already in the system.

## Shapes

Radius 10px (`--radius` 0.625rem) on cards and primary buttons; 8px on nav items. No pill nav. No left-border accent bars.

## Components

- **Primary button:** ink fill, inverse text, full-width in the sidebar footer as Quick Create.
- **Nav item:** muted until current; current is ink fill + inverse text + `aria-current="page"`.
- **Fleet strip:** one card, three linked columns, not three nested cards.
- **Empty state:** icon, title, one-line reason, one primary or outline CTA.
- **Chart card:** pie when values exist; compact empty state with CTA when not.

## Do's and Don'ts

### Do:

- **Do** put fleet counts or the first-create action above greeting weight.
- **Do** collapse empty charts and maps so the next action stays in the first viewport.
- **Do** keep Quick Create as the only filled primary in the shell.

### Don't:

- **Don't** use gradient text, glass chrome, or display fonts on the dashboard.
- **Don't** show "No data to display yet" without a route to create or locate.
- **Don't** duplicate the product name in the top bar when the sidebar already names it (desktop).
