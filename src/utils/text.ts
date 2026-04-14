export function removeTags(html: string = ''): string {
  // If multiple </p> tags, convert intermediate ones to newlines
  if ((html.match(/<\/p>/gi) || []).length > 1) {
    html = html.replace(/<\/p>/gi, (match, offset, str) => {
      const remaining = (str.slice(offset + match.length).match(/<\/p>/gi) || []).length;
      return remaining > 0 ? '\n' : match;
    });
  }
  return html.replace(/(<([^>]+)>)/gi, '');
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // If it already contains HTML tags, sanitize angle brackets that aren't valid tags
  if (/<[a-z][a-z0-9]*(\s[^>]*)?>[^<]*<\/[a-z][a-z0-9]*>/i.test(html)) {
    html = html.replace(new RegExp('(<(?![a-z/!])', 'gi'), '&lt;');
    html = html.replace(/([^a-z0-9"'\s/])>/gi, '$1&gt;');
    return html;
  }
  return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
