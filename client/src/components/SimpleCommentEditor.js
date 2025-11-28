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

      // Convert name to username format (remove spaces, lowercase)
      const username = mention.name.replace(/\s+/g, "").toLowerCase();

      // Insert the mention with space after
      const mentionText = `@${username} `;
      const newValue = beforeMention + mentionText + afterMention;

      setEditorValue(newValue);

      // Notify parent of change
      if (onChange) {
        onChange(newValue);
      }

      // Call callback if provided
      if (onMentionSelect) {
        onMentionSelect(mention);
      }

      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);

      // Set cursor position after the mention
      const newCursorPos = startPos + mentionText.length;

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [mentionStartIndex, editorValue, onMentionSelect, onChange]
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

  return (
    <div className="relative">
      {/* Simple textarea - no overlay */}
      <textarea
        ref={textareaRef}
        value={editorValue}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        dir="ltr"
        className="w-full min-h-[100px] max-h-[200px] p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 relative z-20"
        rows={4}
        spellCheck="false"
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        style={{
          backgroundColor: "#fff",
          color: "#374151",
          fontSize: "14px",
          lineHeight: "1.5",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "12px",
          paddingRight: "48px",
          boxSizing: "border-box",
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
