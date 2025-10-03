import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import MentionDropdown from "./MentionDropdown";

const CommentEditor = ({
  value = "",
  onChange,
  onMentionSelect,
  placeholder = "Add a comment...",
  projectMembers = [],
  currentUser = null,
  cardMembers = [],
}) => {
  const quillRef = useRef(null);
  const [editorValue, setEditorValue] = useState(value || "");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Safe value getter to prevent delta errors
  const getSafeValue = useCallback((htmlValue) => {
    if (!htmlValue || htmlValue.trim() === "") {
      return "";
    }

    // If it's plain text, wrap it in a paragraph
    if (!htmlValue.includes("<")) {
      return `<p>${htmlValue}</p>`;
    }

    return htmlValue;
  }, []);

  // Update editor value when prop value changes
  useEffect(() => {
    const safeValue = getSafeValue(value);
    if (safeValue !== editorValue) {
      setEditorValue(safeValue);
    }
  }, [value, getSafeValue, editorValue]);

  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
    keyboard: {
      bindings: {
        // Handle @ key for mentions
        mention: {
          key: "@",
          handler: function (range, context) {
            // Don't interfere with normal @ typing
            return true;
          },
        },
      },
    },
  };

  const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

  // Handle text changes and detect mentions
  const handleTextChange = useCallback(
    (content, delta, source, editor) => {
      if (source === "user") {
        const text = editor.getText();
        const selection = editor.getSelection();

        if (selection) {
          const beforeCursor = text.substring(0, selection.index);
          const mentionMatch = beforeCursor.match(/@(\w*)$/);

          if (mentionMatch) {
            const query = mentionMatch[1];
            setMentionQuery(query);
            setMentionStartIndex(selection.index - query.length - 1);

            // Get editor bounds for positioning
            const editorBounds = quillRef.current
              ?.getEditor()
              ?.getBounds(selection.index);
            if (editorBounds) {
              setMentionPosition({
                top: editorBounds.top + editorBounds.height + 5,
                left: editorBounds.left,
              });
            }

            setShowMentions(true);
          } else {
            setShowMentions(false);
            setMentionQuery("");
            setMentionStartIndex(-1);
          }
        }
      }

      // Update internal state with safe value
      const safeContent = getSafeValue(content);
      setEditorValue(safeContent);

      if (onChange) {
        onChange(safeContent);
      }
    },
    [onChange, getSafeValue]
  );

  // Handle mention selection
  const handleMentionSelect = useCallback(
    (mention) => {
      if (!quillRef.current) return;

      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();

      if (selection && mentionStartIndex !== -1) {
        // Remove the @ and query text
        const textToRemove = selection.index - mentionStartIndex;
        editor.deleteText(mentionStartIndex, textToRemove);

        // Insert the mention using HTML with Trello-like styling
        const mentionHtml = `<span class="mention" data-user-id="${mention.id}" data-user-name="${mention.name}" style="background-color: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-weight: 500; display: inline-block;">@${mention.name}</span> `;

        editor.clipboard.dangerouslyPasteHTML(mentionStartIndex, mentionHtml);
        editor.setSelection(mentionStartIndex + mentionHtml.length);

        // Call callback if provided
        if (onMentionSelect) {
          onMentionSelect(mention);
        }
      }

      setShowMentions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    },
    [mentionStartIndex, onMentionSelect]
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

  return (
    <div className="relative">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        key="comment-editor"
      />

      {showMentions && (
        <div
          className="mention-dropdown absolute z-50"
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

export default CommentEditor;
