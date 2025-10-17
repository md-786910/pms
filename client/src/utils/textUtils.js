/**
 * Utility functions for text processing
 */

/**
 * Clean HTML tags from text and limit character count
 * @param {string} htmlText - Text that may contain HTML tags
 * @param {number} maxLength - Maximum character length (default: 100)
 * @param {string} fallbackText - Text to return if input is empty or invalid (default: "No description")
 * @returns {string} - Cleaned text with character limit
 */
export const cleanHtmlAndLimit = (
  htmlText,
  maxLength = 100,
  fallbackText = "No description"
) => {
  // Check if text is empty or contains only empty HTML tags
  if (
    !htmlText ||
    htmlText.trim() === "" ||
    htmlText === "<p><br></p>" ||
    htmlText === "<p></p>" ||
    htmlText === "<br>" ||
    htmlText === "<br/>"
  ) {
    return fallbackText;
  }

  // Remove HTML tags and clean up whitespace
  const cleanText = htmlText.replace(/<[^>]*>/g, "").trim();

  // Return limited text with ellipsis if needed
  if (cleanText.length > maxLength) {
    return cleanText.slice(0, maxLength) + "...";
  }

  return cleanText;
};

/**
 * Check if text contains meaningful content (not just empty HTML)
 * @param {string} htmlText - Text to check
 * @returns {boolean} - True if text has meaningful content
 */
export const hasMeaningfulContent = (htmlText) => {
  if (!htmlText || htmlText.trim() === "") return false;

  const cleanText = htmlText.replace(/<[^>]*>/g, "").trim();
  return cleanText.length > 0;
};

/**
 * Strip HTML tags from text
 * @param {string} htmlText - Text containing HTML
 * @returns {string} - Text without HTML tags
 */
export const stripHtmlTags = (htmlText) => {
  if (!htmlText) return "";
  return htmlText.replace(/<[^>]*>/g, "").trim();
};
