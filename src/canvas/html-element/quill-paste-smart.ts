'use client';

import Quill from 'quill';
import DOMPurify from 'dompurify';

const Clipboard = Quill.import('modules/clipboard') as any;
const Delta = Quill.import('delta') as any;

class SmartPasteClipboard extends Clipboard {
  allowed: any;
  keepSelection: boolean;
  substituteBlockElements: boolean;
  magicPasteLinks: boolean;
  hooks: any;

  constructor(quill: any, options: any) {
    super(quill, options);
    this.allowed = options.allowed;
    this.keepSelection = options.keepSelection;
    this.substituteBlockElements = options.substituteBlockElements;
    this.magicPasteLinks = options.magicPasteLinks;
    this.hooks = options.hooks;
  }

  onCapturePaste(e: ClipboardEvent) {
    e.preventDefault();
    const range = this.quill.getSelection();
    let plainText = '', htmlText = '', firstItem: DataTransferItem | undefined;

    if (e.clipboardData?.getData) {
      plainText = e.clipboardData.getData('text/plain');
      htmlText = e.clipboardData.getData('text/html');
      firstItem = e.clipboardData.items?.[0];
    } else if ((window as any).clipboardData?.getData) {
      plainText = (window as any).clipboardData.getData('Text');
    }

    let ops = new Delta().retain(range.index).delete(range.length);
    const purifyOpts = this.getDOMPurifyOptions();
    let isPlainText = false;
    let content = plainText;

    if (!htmlText && purifyOpts.ALLOWED_TAGS.includes('a') && this.isURL(plainText) && range.length > 0 && this.magicPasteLinks) {
      content = this.quill.getText(range.index, range.length);
      ops = ops.insert(content, { link: plainText });
    } else if (!htmlText && purifyOpts.ALLOWED_TAGS.includes('img') && firstItem && firstItem.kind === 'file' && firstItem.type.match(/^image\//i)) {
      const file = firstItem.getAsFile()!;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.quill.insertEmbed(range.index, 'image', ev.target!.result);
        if (!this.keepSelection) this.quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(file);
    } else {
      if (!htmlText) { isPlainText = true; htmlText = content; }

      // Register DOMPurify hooks
      const addHook = (name: string, fn: Function | undefined) => { if (typeof fn === 'function') DOMPurify.addHook(name as any, fn as any); };
      addHook('beforeSanitizeElements', this.hooks?.beforeSanitizeElements);
      addHook('uponSanitizeElement', this.hooks?.uponSanitizeElement);
      addHook('afterSanitizeElements', this.hooks?.afterSanitizeElements);
      addHook('beforeSanitizeAttributes', this.hooks?.beforeSanitizeAttributes);
      addHook('uponSanitizeAttribute', this.hooks?.uponSanitizeAttribute);
      addHook('afterSanitizeAttributes', this.hooks?.afterSanitizeAttributes);
      addHook('beforeSanitizeShadowDOM', this.hooks?.beforeSanitizeShadowDOM);
      addHook('uponSanitizeShadowNode', this.hooks?.uponSanitizeShadowNode);
      addHook('afterSanitizeShadowDOM', this.hooks?.afterSanitizeShadowDOM);

      if (isPlainText) {
        content = DOMPurify.sanitize(htmlText, purifyOpts) as string;
        ops = ops.insert(content);
      } else {
        if (this.substituteBlockElements !== false) {
          const substituted = this.substitute(htmlText, purifyOpts);
          content = substituted.innerHTML;
        } else {
          content = DOMPurify.sanitize(htmlText, purifyOpts) as string;
        }
        ops = ops.concat(this.convert({ html: content }));
      }
    }

    this.quill.updateContents(ops, Quill.sources.USER);
    if (!isPlainText) { ops = this.convert({ html: content }); }
    if (this.keepSelection) {
      this.quill.setSelection(range.index, ops.length(), Quill.sources.SILENT);
    } else {
      this.quill.setSelection(range.index + ops.length(), Quill.sources.SILENT);
    }
    this.quill.scrollSelectionIntoView();
    DOMPurify.removeAllHooks();
  }

  getDOMPurifyOptions(): any {
    const opts: any = {};
    if (this.allowed?.tags) opts.ALLOWED_TAGS = this.allowed.tags;
    if (this.allowed?.attributes) opts.ALLOWED_ATTR = this.allowed.attributes;

    if (opts.ALLOWED_TAGS === undefined || opts.ALLOWED_ATTR === undefined) {
      let needTags = false, needAttr = false;
      if (opts.ALLOWED_TAGS === undefined) { needTags = true; opts.ALLOWED_TAGS = ['p', 'br', 'span']; }
      if (opts.ALLOWED_ATTR === undefined) { needAttr = true; opts.ALLOWED_ATTR = ['class']; }

      const toolbar = this.quill.getModule('toolbar');
      toolbar?.controls?.forEach((control: any[]) => {
        switch (control[0]) {
          case 'bold': if (needTags) { opts.ALLOWED_TAGS.push('b', 'strong'); } break;
          case 'italic': if (needTags) { opts.ALLOWED_TAGS.push('i', 'em'); } break;
          case 'underline': if (needTags) opts.ALLOWED_TAGS.push('u'); break;
          case 'strike': if (needTags) opts.ALLOWED_TAGS.push('s'); break;
          case 'color': case 'background': if (needAttr) opts.ALLOWED_ATTR.push('style'); break;
          case 'script':
            if (needTags) {
              if (control[1]?.value === 'super') opts.ALLOWED_TAGS.push('sup');
              else if (control[1]?.value === 'sub') opts.ALLOWED_TAGS.push('sub');
            }
            break;
          case 'header':
            if (needTags) {
              const addHeader = (val: string) => {
                const map: Record<string, string> = { '1': 'h1', '2': 'h2', '3': 'h3', '4': 'h4', '5': 'h5', '6': 'h6' };
                if (map[val]) opts.ALLOWED_TAGS.push(map[val]);
              };
              if (control[1]?.value) addHeader(control[1].value);
              else if (control[1]?.options?.length) {
                Array.from(control[1].options as HTMLOptionElement[]).forEach((opt) => { if (opt.value) addHeader(opt.value); });
              }
            }
            break;
          case 'code-block':
            if (needTags) opts.ALLOWED_TAGS.push('pre');
            if (needAttr) opts.ALLOWED_ATTR.push('spellcheck');
            break;
          case 'list':
            if (needTags) {
              if (control[1]?.value === 'ordered') opts.ALLOWED_TAGS.push('ol');
              else if (control[1]?.value === 'bullet') opts.ALLOWED_TAGS.push('ul');
              opts.ALLOWED_TAGS.push('li');
            }
            break;
          case 'link':
            if (needTags) opts.ALLOWED_TAGS.push('a');
            if (needAttr) opts.ALLOWED_ATTR.push('href', 'target', 'rel');
            break;
          case 'image':
            if (needTags) opts.ALLOWED_TAGS.push('img');
            if (needAttr) opts.ALLOWED_ATTR.push('src', 'title', 'alt');
            break;
          case 'video':
            if (needTags) opts.ALLOWED_TAGS.push('iframe');
            if (needAttr) opts.ALLOWED_ATTR.push('frameborder', 'allowfullscreen', 'src');
            break;
          case 'blockquote':
            if (needTags) opts.ALLOWED_TAGS.push(control[0]);
            break;
        }
      });
    }
    return opts;
  }

  substitute(html: string, opts: any): HTMLBodyElement {
    const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const divLikeTags = ['p', 'div', 'section', 'article', 'fieldset', 'address', 'aside', 'blockquote',
      'canvas', 'dl', 'figcaption', 'figure', 'footer', 'form', 'header', 'main', 'nav', 'noscript',
      'ol', 'pre', 'table', 'tfoot', 'ul', 'video'];
    const inlineLikeTags = ['li', 'dt', 'dd', 'hr'];
    let containerTag: string | undefined;

    DOMPurify.addHook('uponSanitizeElement', (node: any, data: any, config: any) => {
      let i = 0;
      while (!containerTag && i < 3) {
        if (opts.ALLOWED_TAGS.includes(divLikeTags[i])) containerTag = divLikeTags[i];
        i++;
      }
      if (containerTag && node.tagName && !opts.ALLOWED_TAGS.includes(node.tagName.toLowerCase())) {
        const tag = node.tagName.toLowerCase();
        if (blockTags.includes(tag)) node.innerHTML = `<${containerTag}><b>${node.innerHTML}</b></${containerTag}>`;
        else if (divLikeTags.includes(tag)) node.innerHTML = `<${containerTag}>${node.innerHTML}</${containerTag}>`;
        else if (inlineLikeTags.includes(tag)) node.innerHTML = `${node.innerHTML}<br>`;
      }
    });

    const sanitized = DOMPurify.sanitize(html, { ...opts, RETURN_DOM: true, WHOLE_DOCUMENT: false });
    DOMPurify.removeAllHooks();

    const cloneEl = (el: Element) => {
      const clone = document.createElement(el.tagName.toLowerCase());
      Array.from(el.attributes).forEach((attr) => clone.setAttribute(attr.nodeName, attr.value));
      return clone;
    };

    let depth = 0;
    const walk = (node: Node, cb: (n: Node, d: number) => void) => {
      cb(node, depth);
      node = depth <= 1 ? node.firstChild! : (undefined as any);
      for (; node; ) {
        depth++;
        walk(node, cb);
        node = node.nextSibling!;
      }
      depth--;
    };

    let currentBlock: HTMLElement | undefined;
    const result = document.createElement('body') as HTMLBodyElement;
    walk(sanitized as Node, (node: Node, d: number) => {
      if (d === 1) {
        const el = node as Element;
        if (el.tagName && divLikeTags.includes(el.tagName.toLowerCase())) {
          currentBlock = undefined;
          const clone = cloneEl(el);
          clone.innerHTML = el.innerHTML;
          result.appendChild(clone);
        } else {
          if (!currentBlock) { currentBlock = document.createElement(containerTag!); result.appendChild(currentBlock); }
          if (el.tagName) {
            const clone = cloneEl(el);
            if (el.innerHTML) clone.innerHTML = el.innerHTML;
            currentBlock.appendChild(clone);
          } else {
            currentBlock.appendChild(document.createTextNode(node.textContent || ''));
          }
        }
      }
    });

    return result;
  }

  isURL(str: string): boolean {
    return /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/isu.test(str);
  }
}

export function registerQuillPasteSmart(quill: any): void {
  quill.register('modules/clipboard', SmartPasteClipboard, true);
}
