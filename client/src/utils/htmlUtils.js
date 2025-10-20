/**
 * Utility functions for cleaning HTML content
 */

/**
 * Strips HTML tags and decodes HTML entities from text
 * @param {string} htmlString - The HTML string to clean
 * @returns {string} - Clean text without HTML tags
 */
export const stripHtmlTags = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") {
    return "";
  }

  return (
    htmlString
      // Remove all HTML tags
      .replace(/<[^>]*>/g, "")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&hellip;/g, "...")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      // Clean up extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
};

/**
 * Checks if a string contains only empty HTML tags
 * @param {string} htmlString - The HTML string to check
 * @returns {boolean} - True if the string contains only empty HTML tags
 */
export const isEmptyHtml = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") {
    return true;
  }

  const cleanText = stripHtmlTags(htmlString);
  return cleanText.length === 0 || cleanText === "";
};

/**
 * Gets a truncated version of cleaned HTML text
 * @param {string} htmlString - The HTML string to clean and truncate
 * @param {number} maxLength - Maximum length of the returned string
 * @returns {string} - Clean, truncated text
 */
export const getCleanTextPreview = (htmlString, maxLength = 60) => {
  const cleanText = stripHtmlTags(htmlString);

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  return cleanText.slice(0, maxLength) + "...";
};
