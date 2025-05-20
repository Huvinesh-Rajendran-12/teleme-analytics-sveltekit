<script lang="ts">
  import DOMPurify from 'dompurify';
  
  // The HTML content to render
  export let html: string = '';
  
  // Additional allowed tags
  export let allowedTags: string[] = [];
  
  // Additional allowed attributes
  export let allowedAttr: string[] = [];
  
  // Whether to allow SVG content (useful for icons)
  export let allowSvg: boolean = false;
  
  // Default DOMPurify config
  const defaultConfig = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'a', 'code',
      'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
    ADD_ATTR: ['target'], // For links to open in new tabs
    USE_PROFILES: { svg: allowSvg }
  };
  
  // Function to sanitize HTML
  function sanitizeHtml(content: string): string {
    if (!content) return '';
    
    // Merge custom allowed tags and attributes with defaults
    const config = {
      ...defaultConfig,
      ALLOWED_TAGS: [...defaultConfig.ALLOWED_TAGS, ...allowedTags],
      ALLOWED_ATTR: [...defaultConfig.ALLOWED_ATTR, ...allowedAttr]
    };
    
    // If SVG is allowed, add SVG tags to allowed tags
    if (allowSvg) {
      config.ALLOWED_TAGS = [
        ...config.ALLOWED_TAGS, 
        'svg', 'path', 'circle', 'rect', 'line', 'polyline', 
        'polygon', 'ellipse', 'g', 'defs', 'use', 'mask', 'clipPath'
      ];
      
      config.ALLOWED_ATTR = [
        ...config.ALLOWED_ATTR,
        'viewBox', 'width', 'height', 'xmlns', 'fill', 'stroke',
        'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd',
        'cx', 'cy', 'r', 'x', 'y', 'transform', 'aria-hidden',
        'points', 'x1', 'x2', 'y1', 'y2'
      ];
    }
    
    // Sanitize the HTML
    return DOMPurify.sanitize(content, config);
  }
  
  // Reactive sanitized content
  $: sanitizedHtml = sanitizeHtml(html);
</script>

<!-- Render the sanitized HTML safely -->
{@html sanitizedHtml}
