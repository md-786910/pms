import { useState, useRef, useCallback } from "react";

export const useMentions = (onMentionSelect) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const textRef = useRef(null);

  const handleTextChange = useCallback((e) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // Find @ mentions
    const beforeCursor = text.substring(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const startIndex = cursorPosition - mentionMatch[0].length;
      setMentionStartIndex(startIndex);
      setMentionQuery(mentionMatch[1]);

      // Calculate position for dropdown
      if (textRef.current) {
        const textarea = textRef.current;
        const rect = textarea.getBoundingClientRect();

        // Create a temporary element to measure text position
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.visibility = "hidden";
        tempDiv.style.whiteSpace = "pre-wrap";
        tempDiv.style.font = window.getComputedStyle(textarea).font;
        tempDiv.style.width = textarea.offsetWidth + "px";
        tempDiv.style.padding = window.getComputedStyle(textarea).padding;
        tempDiv.style.border = window.getComputedStyle(textarea).border;
        tempDiv.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
        tempDiv.textContent = beforeCursor;

        document.body.appendChild(tempDiv);
        const textHeight = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);

        // Calculate position with better accuracy
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft =
          window.pageXOffset || document.documentElement.scrollLeft;

        setMentionPosition({
          top: rect.top + textHeight + scrollTop + 2,
          left: rect.left + scrollLeft + 8,
        });
      }

      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    }
  }, []);

  const handleMentionSelect = useCallback(
    (mention) => {
      if (mentionStartIndex === -1 || !textRef.current) return;

      const textarea = textRef.current;
      const text = textarea.value;
      const beforeMention = text.substring(0, mentionStartIndex);
      const afterMention = text.substring(textarea.selectionStart);

      const mentionText = mention.username + " ";
      const newText = beforeMention + mentionText + afterMention;

      // Update the text
      textarea.value = newText;

      // Set cursor position after the mention
      const newCursorPosition = mentionStartIndex + mentionText.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);

      // Trigger change event
      const event = new Event("input", { bubbles: true });
      textarea.dispatchEvent(event);

      // Close mentions
      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);

      // Call the callback with mention data
      if (onMentionSelect) {
        onMentionSelect(mention, newText);
      }

      // Focus back to textarea
      textarea.focus();
    },
    [mentionStartIndex, onMentionSelect]
  );

  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }, []);

  return {
    showMentions,
    mentionPosition,
    mentionQuery,
    textRef,
    handleTextChange,
    handleMentionSelect,
    closeMentions,
  };
};
