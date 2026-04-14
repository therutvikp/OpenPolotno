'use client';

// goober 2.x — lightweight CSS-in-JS runtime
// vendored from https://github.com/cristianbote/goober

let _sheet: { data: string } = { data: '' };

function getSheet(target?: Element): { data: string } {
  if (typeof window === 'object') {
    if (target) {
      // Scoped target: find or create a <style> inside it, return its text node
      const styleEl =
        (target.querySelector('#_goober') as HTMLStyleElement) ||
        Object.assign(target.appendChild(document.createElement('style')), {
          innerHTML: ' ',
          id: '_goober',
        });
      return styleEl.firstChild as Text;
    }
    // Global: cache on window._goober to avoid creating duplicate <style> tags
    if (!(window as any)._goober) {
      const styleEl = Object.assign(
        document.head.appendChild(document.createElement('style')),
        { innerHTML: ' ', id: '_goober' },
      );
      (window as any)._goober = styleEl.firstChild as Text;
    }
    return (window as any)._goober;
  }
  return _sheet;
}

export function extractCss(target?: Element): string {
  const sheet = getSheet(target) as any;
  const result = sheet.data;
  sheet.data = '';
  return result;
}

const RULE_RE = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g;
const CLEAN_RE = /\/\*[^]*?\*\/|\s\s+|\n/g;

function buildCss(obj: any, sel: string): string {
  let result = '';
  let at = '';
  let local = '';

  for (const key in obj) {
    const val = obj[key];
    if (key[0] === '@') {
      if (key[1] === 'i') {
        result = key + ' ' + val + ';';
      } else if (key[1] === 'f') {
        at += buildCss(val, key);
      } else {
        at += key + '{' + buildCss(val, key[1] === 'k' ? '' : sel) + '}';
      }
    } else if (typeof val === 'object') {
      at += buildCss(
        val,
        sel
          ? sel.replace(/([^,])+/g, (s) =>
              key.replace(/(^:.*)|([^,])+/g, (k) =>
                /&/.test(k) ? k.replace(/&/g, s) : s ? s + ' ' + k : k,
              ),
            )
          : key,
      );
    } else if (val != null) {
      const prop = key.replace(/[A-Z]/g, '-$&').toLowerCase();
      local += (buildCss as any).p ? (buildCss as any).p(prop, val) : prop + ':' + val + ';';
    }
  }
  return result + (sel && local ? sel + '{' + local + '}' : local) + at;
}

const _cache: Record<string, string> = {};

function hash(str: string): string {
  let i = 0;
  let h = 11;
  while (i < str.length) h = (101 * h + str.charCodeAt(i++)) >>> 0;
  return 'go' + h;
}

function serialize(str: string): any {
  const r: any[] = [{}];
  let t: RegExpExecArray | null;
  while ((t = RULE_RE.exec(str.replace(CLEAN_RE, '')))) {
    if (t[4]) r.shift();
    else if (t[3]) r.unshift((r[0][t[3]] = r[0][t[3]] || {}));
    else r[0][t[1]] = t[2];
  }
  return r[0];
}

function cxStr(val: any): string {
  if (typeof val === 'object') {
    let s = '';
    for (const k in val) s += k + cxStr(val[k]);
    return s;
  }
  return val as string;
}

function process(
  css: any,
  target: any,
  global: boolean,
  prepend: boolean,
  keyframes: boolean,
): string {
  const key = cxStr(css);
  const cls = _cache[key] || (_cache[key] = hash(key));
  if (!_cache[cls]) {
    const parsed = key !== css ? css : serialize(css);
    _cache[cls] = buildCss(keyframes ? { ['@keyframes ' + cls]: parsed } : parsed, global ? '' : '.' + cls);
  }
  const sheet = getSheet(target) as any;
  if (sheet.data.indexOf(_cache[cls]) === -1) {
    sheet.data = prepend ? _cache[cls] + sheet.data : sheet.data + _cache[cls];
  }
  return cls;
}

let _createElement: any;
let _theme: any;
let _forwardRef: any;

export function css(this: any, ...args: any[]): string {
  const ctx = this || {};
  const template = args[0];
  let cssVal = template?.call ? template(ctx.p) : template;
  if (cssVal && (cssVal as any).unshift) {
    if ((cssVal as any).raw) {
      cssVal = (cssVal as string[]).reduce((acc, part, i) => {
        const interp = args[i];
        if (interp?.call) {
          const r = interp(ctx.p);
          const cls =
            r?.props?.className ||
            (/^go/.test(r) && r);
          interp as any;
          return acc + part + (cls == null ? '' : cls);
        }
        return acc + part + (interp == null ? '' : interp);
      }, '');
    } else {
      cssVal = (cssVal as any[]).reduce((acc: any, t: any) =>
        Object.assign(acc, t?.call ? t(ctx.p) : t),
        {},
      );
    }
  }
  return process(cssVal, ctx.target, ctx.g, ctx.o, ctx.k);
}

export const glob = (css as any).bind({ g: 1 });
export const keyframes = (css as any).bind({ k: 1 });

export function setup(
  createElement: any,
  theme?: () => any,
  globalSetup?: any,
  forwardRef?: any,
): void {
  (buildCss as any).p = globalSetup;
  _createElement = createElement;
  _theme = theme;
  _forwardRef = forwardRef;
}

export function styled(tag: any, forwardRef?: any): (...args: any[]) => any {
  const ctx: any = this || {};
  return function (...args: any[]) {
    function StyledComponent(props: any, ref: any) {
      const p = Object.assign({}, props);
      const className = p.className || StyledComponent.className;
      ctx.p = Object.assign({ theme: _theme && _theme() }, p);
      ctx.o = / *go\d+/.test(className);
      p.className = (css as any).apply(ctx, args) + (className ? ' ' + className : '');
      if (forwardRef) p.ref = ref;
      let comp = tag;
      if (tag[0] && (comp = p.as || tag)) delete p.as;
      if (_forwardRef && comp[0]) _forwardRef(p);
      return _createElement(comp, p);
    }
    if (forwardRef) return forwardRef(StyledComponent);
    return StyledComponent;
  };
}
