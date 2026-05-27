export type TemplateContext = Record<string, string | number | null | undefined>;

export function renderTemplateString(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key: string) => {
    const value = context[key.toLowerCase()] ?? context[key];
    if (value == null || value === '') return '';
    return String(value);
  });
}

export function mergeTemplateContent(args: {
  subject: string;
  text: string;
  html: string;
  overrides?: {
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
  };
  context: TemplateContext;
}) {
  const subjectSource = args.overrides?.subject?.trim() || args.subject;
  const textSource = args.overrides?.bodyText?.trim() || args.text;
  const htmlSource = args.overrides?.bodyHtml?.trim() || args.html;
  return {
    subject: renderTemplateString(subjectSource, args.context),
    text: renderTemplateString(textSource, args.context),
    html: renderTemplateString(htmlSource, args.context),
  };
}
