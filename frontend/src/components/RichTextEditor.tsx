import React, { useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your reply...",
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: [
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      [{ color: [] }, { background: [] }],
      ["link", "image"],
      ["clean"],
    ],
  };

  const formats = [
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "code-block",
    "list",
    "bullet",
    "align",
    "size",
    "color",
    "background",
    "link",
    "image",
  ];

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      .ql-container { font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; }
      .ql-editor { min-height: 300px; max-height: 500px; padding: 16px; line-height: 1.6; color: #1f2937; }
      .ql-editor img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
      .ql-toolbar { background-color: #f3f4f6; border-top: 1px solid #e5e7eb; border-right: none; border-left: none; }
      .ql-toolbar button:hover, .ql-toolbar button.ql-active { color: #10b981; }
      .ql-snow.ql-focused .ql-fill, .ql-snow.ql-focused .ql-stroke.ql-fill { fill: #10b981; }
      .ql-snow.ql-focused .ql-stroke { stroke: #10b981; }
    `;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          insertImageFromFile(file, editor);
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            insertImageFromFile(blob, editor);
          }
        }
      }
    };

    const editorElement = editor.root;
    editorElement.addEventListener("drop", handleDrop);
    editorElement.addEventListener("paste", handlePaste);

    return () => {
      editorElement.removeEventListener("drop", handleDrop);
      editorElement.removeEventListener("paste", handlePaste);
    };
  }, []);

  const insertImageFromFile = (file: File, editor: any) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      const range = editor.getSelection();
      if (range) {
        editor.insertEmbed(range.index, "image", imageDataUrl);
        editor.setSelection(range.index + 1);
      } else {
        const length = editor.getLength();
        editor.insertEmbed(length, "image", imageDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        theme="snow"
        placeholder={placeholder}
      />
      <div className="text-xs text-slate-500 px-4 py-2 bg-slate-50 border-t border-slate-200">
        ?? You can drag and drop images or paste them directly into the editor
      </div>
    </div>
  );
};
