/**
 * Shared React Quill configuration for WordPress-like rich text editing.
 * Includes heading sizes, font color, background color, alignment, etc.
 * 圖片僅允許透過 URL 插入，禁止拖曳/貼上 Base64 圖片以避免資料庫膨脹。
 */

import type { default as ReactQuillType } from 'react-quill-new';

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
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
  'image',
];

/**
 * 攔截 Base64 圖片貼上/拖曳，只允許 URL 圖片。
 * 使用方式：在 ReactQuill 的 ref callback 中呼叫此函式。
 *
 * 範例：
 * <ReactQuill ref={(el) => { if (el) blockBase64Images(el); }} ... />
 */
export function blockBase64Images(quillRef: any) {
  const editor = quillRef?.getEditor?.();
  if (!editor) return;

  // 監聽文字變更，移除 Base64 圖片
  editor.root.addEventListener('drop', (e: DragEvent) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      alert('請使用工具列的圖片按鈕，以 URL 方式插入圖片。不支援直接拖曳圖片。');
    }
  });

  editor.root.addEventListener('paste', (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        e.stopPropagation();
        alert('請使用工具列的圖片按鈕，以 URL 方式插入圖片。不支援直接貼上圖片。');
        return;
      }
    }
  });
}
