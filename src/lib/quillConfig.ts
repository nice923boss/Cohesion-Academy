/**
 * Shared React Quill configuration for WordPress-like rich text editing.
 * Includes heading sizes, font color, background color, alignment, etc.
 * 圖片功能已完全移除，避免 Base64 圖片膨脹資料庫。
 */

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
};

export const quillFormats = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'align',
  'link',
];

/**
 * 攔截圖片拖曳與貼上，完全禁止在富文本編輯器中插入圖片。
 * 使用方式：在 ReactQuill 的 ref callback 中呼叫此函式。
 *
 * 範例：
 * <ReactQuill ref={(el) => { if (el) blockBase64Images(el); }} ... />
 */
export function blockBase64Images(quillRef: any) {
  const editor = quillRef?.getEditor?.();
  if (!editor) return;

  // 阻擋拖曳圖片
  editor.root.addEventListener('drop', (e: DragEvent) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      alert('富文本編輯器不支援插入圖片。如需顯示圖片，請使用獨立的圖片 URL 欄位。');
    }
  });

  // 阻擋貼上圖片
  editor.root.addEventListener('paste', (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        e.stopPropagation();
        alert('富文本編輯器不支援插入圖片。如需顯示圖片，請使用獨立的圖片 URL 欄位。');
        return;
      }
    }
  });
}
