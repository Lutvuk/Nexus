# Design System (Current and Recommended Baseline)

## 1. Design Principles

- Clarity first: high-contrast text and predictable layout hierarchy.
- Fast interaction: controls should be visible and low-friction.
- Progressive disclosure: advanced options in modals/panels, not primary noise.
- Collaboration visibility: activity, notification, and assignment states should remain explicit.

## 2. Visual Language

- Base style: dark workspace with glass-like overlays and subtle depth.
- Shape language:
  - cards and controls: medium radius
  - modals and containers: large radius
- Effects:
  - backdrop blur for layered overlays
  - soft border and shadow stacks for separation

## 3. Color Role Mapping

- Primary action: violet family.
- Assistive/action-neutral: cyan/blue family.
- Warning/highlight: amber.
- Danger/destructive: red.
- Base neutrals: slate/white alpha overlays.

## 4. Component Standards

1. Buttons
- Primary, secondary, danger variants.
- Must include disabled state for async operations.

2. Inputs
- Shared border/radius/focus treatment.
- Focus ring or border change for keyboard visibility.

3. Panels and cards
- Subtle border and surface alpha separation.
- Consistent internal spacing scale.

4. Modals
- Header/body/footer structure.
- Internal scrolling only in content area where needed.

## 5. State System

- Loading:
  - skeletons or label-level "Saving..." states.
- Empty:
  - instructional empty placeholders.
- Error:
  - toast feedback and clear action path.
- Success:
  - concise completion toasts.

## 6. Typography and Spacing

- Headline:
  - semibold, compact tracking.
- Body:
  - regular weight, readable line height.
- Metadata:
  - small sizes for timestamps/hints.
- Spacing:
  - 2/3/4/6 scale progression in most controls and cards.

## 7. Accessibility Guidance

- Preserve contrast for all text over translucent backgrounds.
- Keep focus-visible behavior for keyboard navigation.
- Ensure icon-only actions include title/aria labels.
- Avoid relying on color alone to indicate critical status.

## 8. Responsive Rules

- Fixed navbar with route content offset.
- Horizontal board scrolling for column-heavy layouts.
- Modal max-height constraints with internal scroll.
- Mobile action shortcuts via floating action controls where relevant.
