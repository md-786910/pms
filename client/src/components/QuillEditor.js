import React, { useRef, useEffect, useState, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import MentionDropdown from "./MentionDropdown";

const QuillEditor = ({
  value = "",
  onChange,
  placeholder = "Type something...",
  projectMembers = [],
  currentUser = null,
  cardMembers = [],
  onMentionSelect,
  className = "",
  readOnly = false,
}) => {
  const quillRef = useRef(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [editorValue, setEditorValue] = useState(value || "");

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
    keyboard: {
      bindings: {
        // Custom key bindings for mentions
        mention: {
          key: " ",
          handler: function (range, context) {
            if (context.prefix === "@") {
              this.quill.setSelection(range.index - 1, 1);
              this.quill.deleteText(range.index - 1, 1);
              this.quill.insertText(range.index - 1, "@");
              return false;
            }
            return true;
          },
        },
        tag: {
          key: " ",
          handler: function (range, context) {
            if (context.prefix === "#") {
              this.quill.setSelection(range.index - 1, 1);
              this.quill.deleteText(range.index - 1, 1);
              this.quill.insertText(range.index - 1, "#");
              return false;
            }
            return true;
          },
        },
        // Handle Enter key for mentions
        mentionEnter: {
          key: 13, // Enter key
          handler: function (range, context) {
            if (context.prefix === "@") {
              // Don't create new line, let mention handler deal with it
              return false;
            }
            return true;
          },
        },
      },
    },
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "link",
  ];

  // Handle text changes and detect mentions/tags
  const handleTextChange = useCallback(
    (content, delta, source, editor) => {
      if (source === "user") {
        const text = editor.getText();
        const selection = editor.getSelection();

        if (selection) {
          const beforeCursor = text.substring(0, selection.index);
          const mentionMatch = beforeCursor.match(/@(\w*)$/);
          const tagMatch = beforeCursor.match(/#(\w*)$/);

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
          } else if (tagMatch) {
            const tagName = tagMatch[1];
            if (tagName.length > 0) {
              // Apply tag immediately using HTML
              const startIndex = selection.index - tagName.length - 1;
              editor.deleteText(startIndex, tagName.length + 1);
              editor.insertText(startIndex, `#${tagName} `);
              editor.formatText(startIndex, tagName.length + 1, {
                background: "#f3e5f5",
                color: "#7b1fa2",
                "font-weight": "bold",
              });
              editor.setSelection(startIndex + tagName.length + 2);
            }
          } else {
            setShowMentions(false);
            setMentionQuery("");
            setMentionStartIndex(-1);
          }
        }
      }

      // Update internal state
      setEditorValue(content);

      if (onChange) {
        onChange(content);
      }
    },
    [onChange]
  );

  // Initialize editor value when component mounts or value changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value || "");
    }
  }, [value]);

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

        // Insert the mention using HTML
        editor.insertText(mentionStartIndex, `${mention.username} `);
        editor.formatText(mentionStartIndex, mention.username.length, {
          background: "#e3f2fd",
          color: "#1976d2",
          "font-weight": "bold",
        });
        editor.setSelection(mentionStartIndex + mention.username.length + 1);

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
    <div className={`relative ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
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

export default QuillEditor;
