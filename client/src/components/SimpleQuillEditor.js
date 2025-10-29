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
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

  const formats = ["bold", "italic", "underline", "list", "bullet", "link"];

  const handleChange = (content) => {
    setEditorValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  return (
    <div className="simple-quill-editor">
      <ReactQuill
        theme="snow"
        value={editorValue}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{ height: height }}
      />
    </div>
  );
};

export default SimpleQuillEditor;
