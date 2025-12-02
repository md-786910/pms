import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const SimpleQuillEditor = ({
  value = "",
  onChange,
  placeholder = "Type something...",
  height = "120px",
  readOnly = false,
}) => {
  const [editorValue, setEditorValue] = useState(value);

  // Update editor value when prop value changes
  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, false] }], // Header dropdown
      ["bold", "italic", "underline"], // Text formatting
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }], // Lists
      ["link"], // Links
      ["clean"], // Clear formatting
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "color",
    "background",
    "list",
    "bullet",
    "link",
  ];

  const handleChange = (content) => {
    setEditorValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  return (
    <div className="simple-quill-editor">
      <style>
        {`
          .simple-quill-editor .ql-container {
            height: ${height};
            overflow-y: auto;
          }
          .simple-quill-editor .ql-editor {
            min-height: ${height};
          }
          .simple-quill-editor .ql-toolbar {
            position: sticky;
            top: 0;
            z-index: 1;
            background: white;
            border-bottom: 1px solid #ccc;
          }
        `}
      </style>
      <ReactQuill
        theme="snow"
        value={editorValue}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
      />
    </div>
  );
};

export default SimpleQuillEditor;
