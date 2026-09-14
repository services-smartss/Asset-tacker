# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

<!-- inferred from README + approved dashboard UI plan -->
Primary users are IT administrators and workspace members who track hardware, licences, accessories, and consumables for an organization. Admins scan fleet health and act (create, assign, locate). Members look up their own assets, requests, and tickets.

## Product Purpose

<!-- inferred from README -->
Asset Tracker is open-source IT asset management: full lifecycle tracking for hardware and related inventory, with role-based access, audit logging, and SSO. Success on the dashboard is seeing fleet state in seconds and knowing the next action when the fleet is empty.

## Positioning

<!-- inferred from README -->
Self-hostable (or Vercel-hosted) asset operations for teams of any size, with RBAC, audit trail, and integrations — not a generic ITSM suite.

## Operating Context

Authenticated app shell: dark-neutral sidebar, light content pane, Quick Create for admins, dashboard as the home after login. Empty orgs are common on first deploy. Operators work at a desk (desktop) and on the floor (phone / PWA).

## Capabilities and Constraints

This pass refines **dashboard + app shell only**. Do not change API, Prisma, auth, widget persistence, list pages, forms, or landing. Navigation structure and routes stay as implemented. Incumbent visual system is Geist + shadcn tokens in `src/app/globals.css`.

## Brand Commitments

Product name: **Asset Tracker**. Voice is operational and direct. No marketing display type or decorative effects on Operate surfaces.

## Evidence on Hand

Real product: login, dashboard, inventory modules, empty states with no sample fleet. Do not invent customer logos, metrics, or testimonials. Dashboard numbers come from live org data (`getAssetCount`, status distribution, geocoded locations).

## Product Principles

1. The dashboard answers “what should I do now?” before it greets.
2. Empty states teach by offering a real next action, not a dead chart.
3. Familiar product UI: scanability and native affordances over novelty.
4. One primary create action in the shell (Quick Create); do not compete with it.
5. Preserve product truth; refine craft inside the existing identity.

## Accessibility & Inclusion

Keyboard navigation, skip-to-content, and 44px touch targets on mobile already exist. Keep contrast ≥4.5:1 on body text; selected nav must remain distinguishable without color alone (`aria-current`).
