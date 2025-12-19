# Event Seating Map - Frontend

Interactive seat selection interface for event venues.

## Architecture

- **React 18** with TypeScript strict mode
- **SVG-based rendering** for 15K+ seats with smooth 60fps
- **localStorage** for persistent seat selection
- **Virtualization** via SVG viewport for performance
- **Responsive design** with mobile support

## Features

✅ Interactive seat selection (max 8 seats)
✅ Keyboard navigation and accessibility
✅ Real-time subtotal calculation
✅ Persistent selection across reloads
✅ Dark mode with WCAG AA contrast
✅ Heat-map visualization by price tier
✅ Find adjacent seats helper
✅ Pan & zoom controls
✅ Mobile-responsive

## Setup
```bash
pnpm install
pnpm dev
```

## Testing

Test with different viewport sizes and keyboard-only navigation.

## Trade-offs

- Mock data generated in-memory vs loading from venue.json for demo purposes
- SVG chosen over Canvas for better accessibility
- No external state management library (React state sufficient for scope)