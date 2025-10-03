import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import MentionDropdown from "./MentionDropdown";

const SimpleCommentEditor = ({
  value = "",
  onChange,
  onMentionSelect,
  onSend,
  placeholder = "Add a comment...",
  projectMembers = [],
  currentUser = null,
  cardMembers = [],
}) => {
  const textareaRef = useRef(null);
  const [editorValue, setEditorValue] = useState(value || "");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Update editor value when prop value changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value || "");
    }
  }, [value]);

  // Handle text changes and detect mentions
  const handleTextChange = useCallback(
    (e) => {
      const content = e.target.value;
      setEditorValue(content);

      // Detect mentions
      const cursorPosition = e.target.selectionStart;
      const beforeCursor = content.substring(0, cursorPosition);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        const query = mentionMatch[1];
        setMentionQuery(query);
        setMentionStartIndex(cursorPosition - query.length - 1);

        // Get textarea bounds for positioning
        const textareaBounds = textareaRef.current?.getBoundingClientRect();
        if (textareaBounds) {
          const dropdownHeight = 200;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - textareaBounds.bottom;
          const spaceAbove = textareaBounds.top;

          let top, left;

          if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
            top = textareaBounds.top - dropdownHeight - 5;
          } else {
            top = textareaBounds.bottom + 5;
          }

          const dropdownWidth = 240;
          if (textareaBounds.left + dropdownWidth > window.innerWidth) {
            left = window.innerWidth - dropdownWidth - 10;
          } else {
            left = textareaBounds.left;
          }

          setMentionPosition({
            top: Math.max(10, top),
            left: Math.max(10, left),
          });
        }

        setShowMentions(true);
      } else {
        setShowMentions(false);
        setMentionQuery("");
        setMentionStartIndex(-1);
      }

      if (onChange) {
        onChange(content);
      }
    },
    [onChange]
  );

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (mention) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const startPos = mentionStartIndex;
      const endPos = textarea.selectionStart;

      // Remove the @ and query text
      const beforeMention = editorValue.substring(0, startPos);
      const afterMention = editorValue.substring(endPos);

      // Insert the mention
      const mentionText = `@${mention.name} `;
      const newValue = beforeMention + mentionText + afterMention;

      setEditorValue(newValue);

      // Set cursor position after the mention
      const newCursorPos = startPos + mentionText.length;

      // Update cursor position immediately and focus
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        // Trigger a change event to update the display layer
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);
      });

      // Call callback if provided
      if (onMentionSelect) {
        onMentionSelect(mention);
      }

      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    },
    [mentionStartIndex, editorValue, onMentionSelect]
  );

  // Close mentions dropdown
  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }, []);

  // Handle clicks outside to close mentions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMentions && !event.target.closest(".mention-dropdown")) {
        closeMentions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMentions, closeMentions]);

  // Handle send button click
  const handleSend = useCallback(() => {
    if (editorValue.trim() && onSend) {
      onSend(editorValue);
      setEditorValue("");
    }
  }, [editorValue, onSend]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e) => {
      if (showMentions) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeMentions();
        }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to send
        e.preventDefault();
        handleSend();
      }
    },
    [showMentions, closeMentions, handleSend]
  );

  // Render styled text with colored mentions
  const renderStyledText = useCallback(
    (text) => {
      if (!text) return "";

      // Split text by mentions (@username)
      const parts = text.split(/(@\w+)/g);
      console.log(
        "Rendering text:",
        text,
        "Parts:",
        parts,
        "Project members:",
        projectMembers
      );

      return parts.map((part, index) => {
        if (part.startsWith("@")) {
          const username = part.substring(1);
          console.log("Looking for user:", username);

          const user = projectMembers.find((member) => {
            const memberUsername = member.user.name
              .toLowerCase()
              .replace(/\s+/g, "");
            console.log(
              "Comparing:",
              username.toLowerCase(),
              "with",
              memberUsername
            );
            return memberUsername === username.toLowerCase();
          });

          console.log("Found mention:", part, "User:", user);

          if (user) {
            const userColor = user.user.color || "#3b82f6";
            // Convert hex to RGB for better opacity control
            const rgb = hexToRgb(userColor);
            const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

            return (
              <span
                key={index}
                className="mention-styled"
                style={{
                  backgroundColor: backgroundColor,
                  color: userColor,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  display: "inline-block",
                  margin: "0 2px",
                  fontSize: "14px",
                  lineHeight: "1.2",
                  border: `1px solid ${userColor}20`,
                  boxShadow: `0 1px 2px ${userColor}20`,
                  verticalAlign: "baseline",
                  textDecoration: "none",
                }}
              >
                {part}
              </span>
            );
          } else {
            // Show unstyled mention if user not found
            return (
              <span key={index} style={{ color: "#ef4444", fontWeight: "500" }}>
                {part}
              </span>
            );
          }
        }
        return part;
      });
    },
    [projectMembers]
  );

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 }; // Default blue
  };

  return (
    <div className="relative">
      {/* Display layer for styled mentions */}
      <div
        className="absolute inset-0 pointer-events-none z-10 whitespace-pre-wrap break-words overflow-hidden"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "14px",
          lineHeight: "1.5",
          minHeight: "100px",
          maxHeight: "200px",
          padding: "12px",
          border: "1px solid transparent",
          borderRadius: "8px",
          color: "#374151",
          boxSizing: "border-box",
          backgroundColor: "transparent",
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
      >
        {renderStyledText(editorValue)}
      </div>

      {/* Actual textarea for input */}
      <textarea
        ref={textareaRef}
        value={editorValue}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-h-[100px] max-h-[200px] p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 relative z-20"
        rows={4}
        style={{
          backgroundColor: "transparent",
          color: "transparent",
          caretColor: "#000",
          fontSize: "14px",
          lineHeight: "1.5",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "12px",
          paddingRight: "48px",
          boxSizing: "border-box",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          spellCheck: false, // Disable spell check
        }}
      />

      {/* Send button - appears when there's text */}
      {editorValue.trim() && onSend && (
        <button
          onClick={handleSend}
          className="absolute bottom-3 right-3 z-30 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
          title="Send comment (Ctrl+Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      )}

      {showMentions && (
        <div
          className="mention-dropdown fixed z-50"
          style={{
            top: mentionPosition.top,
            left: mentionPosition.left,
          }}
        >
          <MentionDropdown
            isOpen={showMentions}
            position={mentionPosition}
            onClose={closeMentions}
            onSelect={handleMentionSelect}
            projectMembers={projectMembers}
            currentUser={currentUser}
            cardMembers={cardMembers}
            mentionQuery={mentionQuery}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleCommentEditor;
