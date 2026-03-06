import { defaultSchema } from 'rehype-sanitize';

// Extend the default schema to preserve shiki/rehype-pretty-code output
// while still stripping dangerous HTML from user-submitted content.
export const shikiSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      'data-language',
      'data-theme',
    ],
    pre: [
      ...(defaultSchema.attributes?.pre || []),
      'data-language',
      'data-theme',
      'style',
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      'data-line',
      'data-highlighted-line',
      'style', // shiki uses inline styles for token colors
    ],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'figure',
    'figcaption',
  ],
};
