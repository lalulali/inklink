---
title: Design System and Component Architecture
# inclusion: fileMatch
# fileMatchPattern: "**/*.{tsx,jsx,ts,js,vue,svelte,css,scss,dart}"
inclusion: auto
description: use when developing frontend and managing design system and language
---

# Design System and Component Architecture

## Core Principles

### Unified Design Language
Every page and feature in this application shares a unified design language through reusable components. Changes to a component automatically reflect across the entire application.

### Beautiful & Thoughtful UI/UX
Design should be both aesthetically pleasing and functionally excellent. Every interaction should feel intentional, smooth, and delightful.

## Design Philosophy

### Visual Excellence
- **Clean & Modern**: Embrace whitespace, clear hierarchy, and modern aesthetics
- **Consistent Visual Language**: Use consistent spacing, typography, colors, and shapes
- **Attention to Detail**: Pixel-perfect alignment, smooth animations, polished micro-interactions
- **Visual Hierarchy**: Guide users' attention with size, color, contrast, and positioning
- **Responsive Beauty**: Design looks stunning on all screen sizes

### Thoughtful UX Principles
- **User-Centric**: Design for the user's needs, not technical constraints
- **Intuitive Navigation**: Users should never feel lost or confused
- **Clear Feedback**: Every action has immediate, clear visual feedback
- **Reduce Cognitive Load**: Simplify complex tasks, minimize decisions
- **Accessibility First**: Design works for everyone, including assistive technologies
- **Performance Matters**: Fast loading, smooth animations, no janky interactions
- **Error Prevention**: Design to prevent errors before they happen
- **Graceful Error Handling**: When errors occur, guide users to recovery

### Interaction Design
- **Micro-interactions**: Subtle animations that provide feedback (hover states, loading, success)
- **Smooth Transitions**: Page transitions and state changes feel natural
- **Touch-Friendly**: Adequate touch targets (min 44x44px), gesture support
- **Keyboard Navigation**: Full keyboard support with visible focus states
- **Loading States**: Never leave users wondering if something is happening
- **Empty States**: Thoughtful designs for empty data states with clear next actions

### Emotional Design
- **Delight Users**: Surprise and delight with thoughtful touches
- **Build Trust**: Consistent, reliable, professional experience
- **Reduce Anxiety**: Clear progress indicators, undo options, confirmation dialogs
- **Celebrate Success**: Positive feedback for completed actions
- **Human Touch**: Friendly copy, helpful error messages, personality in the right places

## Component Architecture

### Shared Component Library
- All reusable UI components live in a centralized location (e.g., `src/components/` or `src/design-system/`)
- Components are atomic, composable, and follow single responsibility principle
- Each component is self-contained with its own styles, logic, and tests

### Component Categories
1. **Primitives**: Basic building blocks (Button, Input, Text, Icon)
2. **Patterns**: Common UI patterns (Card, Modal, Dropdown, Navigation)
3. **Layouts**: Page structure components (Container, Grid, Stack, Spacer)
4. **Compositions**: Feature-specific combinations of primitives and patterns

### Component Guidelines
- Components accept props for customization, not hardcoded values
- Use TypeScript interfaces for prop definitions
- Include default props for common use cases
- Support theming through design tokens or CSS variables
- Maintain consistent naming conventions

## Design Tokens

### Token Categories
All design values are defined centrally and never hardcoded in components.

**Color Tokens**
- Primary, secondary, accent colors
- Semantic colors (success, warning, error, info)
- Neutral scale (grays for text, borders, backgrounds)
- Interactive states (hover, active, disabled, focus)
- Support for light/dark themes

**Typography Tokens**
- Font families (primary, secondary, monospace)
- Font sizes (scale: xs, sm, base, lg, xl, 2xl, etc.)
- Font weights (light, regular, medium, semibold, bold)
- Line heights (tight, normal, relaxed)
- Letter spacing

**Spacing Tokens**
- Consistent spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- Padding and margin utilities
- Gap values for flex/grid layouts

**Layout Tokens**
- Breakpoints (mobile, tablet, desktop, wide)
- Container max-widths
- Z-index scale

**Animation Tokens**
- Duration (fast: 150ms, normal: 300ms, slow: 500ms)
- Easing functions (ease-in, ease-out, ease-in-out, spring)
- Transition properties

**Border & Shadow Tokens**
- Border radius (none, sm, md, lg, full)
- Border widths
- Shadow elevations (sm, md, lg, xl)

### Token Implementation
- Use CSS variables, theme objects, or design token files
- Never hardcode design values in individual components
- Changes to tokens propagate automatically across all components

## Implementation Rules

### When Creating New Features
- ALWAYS use existing components from the design system first
- If a component doesn't exist, create it in the shared component library
- If modifying a component, ensure changes work for all existing usages
- Document component APIs and usage examples

### When Modifying Components
- Test changes across all pages that use the component
- Consider backward compatibility
- Update component documentation
- Run visual regression tests if available

### Component Import Pattern
```typescript
// Good: Import from centralized design system
import { Button, Card, Input } from '@/components';
import { Button, Card, Input } from '@/design-system';

// Bad: Creating duplicate components
import { Button } from './Button';  // Local duplicate
```

### Avoiding Duplication
- Never create component copies with different names (Button2, CardNew, etc.)
- Never create page-specific versions of shared components
- If customization is needed, extend the shared component with props
- Use composition over duplication

## File Organization
```
src/
├── components/          # Shared component library
│   ├── primitives/     # Basic UI elements
│   ├── patterns/       # Common patterns
│   ├── layouts/        # Layout components
│   └── index.ts        # Central export
├── styles/
│   ├── tokens.ts       # Design tokens
│   └── theme.ts        # Theme configuration
└── pages/              # Page implementations using components
```

## Testing Strategy
- Unit tests for component logic
- Visual regression tests for UI consistency
- Integration tests for component interactions
- Accessibility tests for all components

## Documentation
- Maintain a component library documentation (Storybook, Styleguidist, or similar)
- Include usage examples for each component
- Document props, variants, and edge cases
- Keep screenshots or live examples updated

## Change Management
When updating a shared component:
1. Review all usages of the component
2. Test changes in different contexts
3. Update documentation and examples
4. Consider creating a new variant instead of breaking changes
5. Communicate changes to the team

## Consistency Checklist
- [ ] Component exists in shared library
- [ ] Design tokens used (no hardcoded values)
- [ ] Props interface defined with TypeScript
- [ ] Component documented with examples
- [ ] Tests cover main use cases
- [ ] Accessible (keyboard navigation, ARIA labels, screen reader support)
- [ ] Responsive design implemented
- [ ] Works with theme/dark mode if applicable
- [ ] Smooth animations and transitions
- [ ] Loading and error states designed
- [ ] Empty states designed
- [ ] Hover, focus, active, disabled states implemented
- [ ] Touch-friendly (adequate touch targets)
- [ ] Visual hierarchy clear
- [ ] Micro-interactions polished

## Design Quality Standards

### Before Shipping Any UI
- [ ] Pixel-perfect alignment and spacing
- [ ] Consistent with design system tokens
- [ ] Smooth, performant animations (60fps)
- [ ] All interactive states implemented
- [ ] Accessible to keyboard and screen readers
- [ ] Responsive across all breakpoints
- [ ] Loading states never leave users waiting without feedback
- [ ] Error messages are helpful and actionable
- [ ] Empty states guide users to next action
- [ ] Tested with real content (not just lorem ipsum)
- [ ] Works in light and dark mode (if applicable)
- [ ] No layout shift or jank during loading
