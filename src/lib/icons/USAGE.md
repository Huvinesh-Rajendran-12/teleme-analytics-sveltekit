# Icon System Usage Guide

## Overview

The icon system is built around a consistent, reusable pattern using a base SVG component. This ensures consistent rendering, styling, and behavior across all icons.

## Core Components

### BaseIcon.svelte

The `BaseIcon.svelte` component provides the foundation for all icons with consistent default properties:

- SVG viewport setup
- Stroke rendering settings
- Size handling

### Icon.svelte

The `Icon.svelte` component serves as a wrapper that dynamically loads the appropriate icon component based on the name prop.

## Usage Examples

```svelte
<!-- Basic usage with default settings -->
<Icon name="user" />

<!-- Custom styling -->
<Icon name="chart" size={32} color="#FF5733" strokeWidth={1.5} />

<!-- In a button -->
<button class="btn">
  <Icon name="plusUser" size={20} /> Add User
</button>

<!-- Responsive sizing -->
<Icon name="magnifyingGlass" class="md:w-6 w-4" />
```

## Design Consistency

All icons follow these design principles:

1. Use `currentColor` as the default color value to inherit from parent elements
2. Consistent background/fill colors when needed:
   - `#E8F0FE` for backgrounds/fills
   - `#A4C2F7` for accent elements
3. Always use the BaseIcon component to maintain consistent rendering properties
4. Avoid using text elements in SVGs in favor of vector paths

## Custom Icon Creation

When creating new icons:

1. Use the BaseIcon component
2. Follow the established pattern of standardized props
3. Use consistent fill colors defined as constants in the component
4. Use explicit dimensions rather than relative positioning when possible

```svelte
<!-- Template for new icon -->
<script lang="ts">
  import BaseIcon from './BaseIcon.svelte';
  export let size = 24;
  export let color = "currentColor";
  export let strokeWidth = 2;
  
  // Colors for consistent styling
  const bgColor = "#E8F0FE";
  const accentColor = "#A4C2F7";
</script>

<BaseIcon {size} {color} {strokeWidth}>
  <!-- Icon shape paths here -->
</BaseIcon>
```