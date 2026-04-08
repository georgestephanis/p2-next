# H2 Feature Audit — Notable Gaps in p2026

Date: 2026-04-08

This document captures notable features and patterns in the H2 theme (humanmade/h2) that are either not currently planned in p2026 or warrant explicit evaluation.

## Notable H2 Features Not Yet Accounted For

### 1. **Network User Hovercards**

**H2 pattern:** Hovercards preview user profiles on multisite networks, powered by a Mapbox key and Global Facts plugin integration.

**p2026 status:**

-   Has link-preview module for internal post/comment links
-   Has hovercard support in mentions module for @mentions
-   **Gap:** No planned user-profile hovercard system separate from mentions; particularly no multisite network user preview pattern

**Note for future:** If multisite becomes a first-class feature, consider whether network-wide user hovercards should be a companion discovery/onboarding feature.

---

### 2. **Network Site Selector / Workspace Hub**

**H2 pattern:** h2-site-selector plugin (network-wide activation) provides a sidebar widget for switching between sites in a multisite network.

**p2026 status:**

-   Multisite xposting is planned in [22-multisite-xposting.md](./22-multisite-xposting.md), focusing on cross-site publishing and digest
-   **Gap:** No planned UI for switching between sites in a network; multisite roadmap centers on content aggregation, not navigation

**Note for future:** If xposting ships, evaluate whether site-selector should be a companion module for network navigation (separate from content replication).

---

### 3. **Extended Emoji Reactions**

**H2 pattern:** h2-emoji-reactions plugin supports multiple emoji reaction types (not just like/thumbs-up), with count display and participant listing.

**p2026 status:**

-   Planned in [16-reactions.md](./16-reactions.md) with an open question: "Should the first version be a single reaction or multiple emoji types?"
-   Current plan leans toward starting with a single reaction type

**Note for future:** H2's multi-emoji approach provides a reference implementation. If implementing reactions, consider whether multiple emoji types should be first-class (vs progressive enhancement from like-only).

---

### 4. **Third-Party Reaction Coexistence**

**H2 pattern:** Documentation explicitly states H2 supports Jetpack reactions and other third-party reaction systems without conflict.

**p2026 status:**

-   No explicit architectural decision about coexistence with Jetpack or other plugin reaction providers
-   Audit log and notifications modules are designed as reusable layers, which may support third-party integrations

**Note for future:** If implementing reactions, explicitly design for coexistence with Jetpack and other providers (e.g., via filters, separate REST endpoints, or event buses).

---

### 5. **Form Integration (Gravity Forms)**

**H2 pattern:** Documented support for Gravity Forms with iframe add-on integration.

**p2026 status:**

-   No explicit form integration planning; [20-external-integrations.md](./20-external-integrations.md) focuses on Slack and GitHub, not WordPress plugins
-   **Gap:** No documented form embed or compatibility story

**Note for future:** If external integrations or site-building features ship, consider whether Gravity Forms (or WordPress form ecosystem) compatibility should be part of intranet setup docs.

---

### 6. **Theme-Based Architecture vs. Plugin-Based**

**H2 pattern:** Fully realized as a WordPress theme with companion plugins for add-on features; uses humanmade/asset-loader + Webpack for bundling.

**p2026 pattern:** Plugin-based architecture with progressive enhancement of theme-rendered feeds; uses @wordpress/scripts.

**Note:** This is a foundational architectural difference. H2's theme-first approach enables more invasive theming and full layout control. p2026's plugin-first approach enables installation on any existing theme/site. Both are valid; just documenting the pattern difference for future architectural decisions.

---

## Summary of Recommended Evaluations

1. **Multisite UX (cross-site navigation)** — Consider site-selector UI if xposting becomes a primary feature
2. **Emoji reactions scope** — Decide whether multi-emoji or single-like; H2 uses multi-emoji as foundation
3. **Plugin coexistence** — Explicitly design reactions/integrations for coexistence with Jetpack and similar
4. **Network user discovery** — If multisite ships, plan user-profile hovercards as a companion module
5. **Forms ecosystem** — Document compatibility story if site-building or team hub use cases grow

---

## References

-   H2 Repository: https://github.com/humanmade/h2
-   H2 Emoji Reactions: https://github.com/humanmade/h2-emoji-reactions
-   H2 Site Selector: https://github.com/humanmade/h2-site-selector
-   p2026 Planned Features: [README.md](./README.md)
