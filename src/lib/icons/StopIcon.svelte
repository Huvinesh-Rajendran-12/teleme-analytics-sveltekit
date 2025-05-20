<script lang="ts">
  import BaseIcon from './BaseIcon.svelte';

  export let size: number | string = '24';
  export let color: string = 'currentColor';
</script>

<BaseIcon {size} {color}>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor"/>
    <rect x="8" y="8" width="8" height="8" fill="currentColor"/>
  </svg>
</BaseIcon>
