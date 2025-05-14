import DOMPurify from "dompurify";
import { browser } from "$app/environment";

/**
 * Safely processes SVG content in text.
 *
 * This utility function identifies SVG content within a string and sanitizes it
 * to prevent XSS attacks while preserving valid SVG functionality.
 *
 * @param {string} text - The text that may contain SVG content.
 * @returns {string} The processed text with sanitized SVG content.
 */
export function processSvgContent(text: string): string {
  if (!browser) {
    return text; // Skip processing on server-side
  }

  if (!text || typeof text !== "string") {
    return text || "";
  }

  try {
    // Create a sanitized version of the HTML with DOMPurify
    const sanitized = DOMPurify.sanitize(text, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: [
        "svg",
        "path",
        "circle",
        "rect",
        "line",
        "polyline",
        "polygon",
        "g",
        "text",
      ],
      ADD_ATTR: [
        "viewBox",
        "preserveAspectRatio",
        "xmlns",
        "stroke",
        "fill",
        "stroke-width",
        "d",
        "cx",
        "cy",
        "r",
        "x",
        "y",
        "width",
        "height",
        "points",
      ],
    });

    return sanitized;
  } catch (error) {
    console.error("Error sanitizing SVG content:", error);
    // If there's an error during sanitization, return the original text
    return text;
  }
}
