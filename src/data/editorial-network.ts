import { practiceClaims, theoryClaims } from './site-facts.ts';

export type EditorialKind = 'essay' | 'note' | 'annotation' | 'static';

export type EditorialForm =
  | 'Essay'
  | 'Note'
  | 'Reading annotation'
  | 'Working theory'
  | 'Practice';

export type EditorialReference =
  | { kind: 'essay'; slug: string }
  | { kind: 'note'; slug: string }
  | { kind: 'annotation'; slug: string }
  | { kind: 'static'; slug: string };

export interface EditorialContinuation {
  target: EditorialReference;
  connection?: string;
}

export interface InquiryTrailDefinition {
  id: string;
  question: string;
  objects: EditorialReference[];
}

export const editorialForms: Record<EditorialKind, EditorialForm> = {
  essay: 'Essay',
  note: 'Note',
  annotation: 'Reading annotation',
  static: 'Working theory',
};

export const staticEditorialTargets = [
  {
    ref: { kind: 'static', slug: 'third-enlightenment' },
    title: 'Third Enlightenment',
    path: '/third-enlightenment',
    publicationStatus: 'published',
    context: theoryClaims.summary,
    form: 'Working theory',
  },
  {
    ref: { kind: 'static', slug: 'yoga' },
    title: 'Yoga',
    path: '/yoga',
    publicationStatus: 'published',
    context: practiceClaims.yogaMethod,
    form: 'Practice',
  },
] as const;

export const inquiryTrails: InquiryTrailDefinition[] = [
  {
    id: 'rules-and-judgment',
    question: 'What should become a rule—and what should remain judgment?',
    objects: [
      { kind: 'essay', slug: 'what-rules-cant-capture' },
      { kind: 'note', slug: 'teaching-ai-to-think-like-you' },
      { kind: 'note', slug: 'where-you-want-variance' },
      { kind: 'annotation', slug: 'rules' },
      { kind: 'annotation', slug: 'seeing-like-a-state' },
    ],
  },
  {
    id: 'direction-and-commitment',
    question: 'How do organizations choose—and hold—a direction when metrics cannot settle it?',
    objects: [
      { kind: 'essay', slug: 'the-right-direction' },
      { kind: 'annotation', slug: 'sovereignty-of-good' },
      { kind: 'essay', slug: 'strategic-time' },
      { kind: 'essay', slug: 'architecture-of-commitment' },
      { kind: 'annotation', slug: 'finite-and-infinite-games' },
      { kind: 'note', slug: 'from-org-theory-to-ai' },
    ],
  },
  {
    id: 'delegable-cognition',
    question: 'When cognition becomes delegable, what still requires a person?',
    objects: [
      { kind: 'note', slug: 'the-dot-collector' },
      { kind: 'essay', slug: 'what-rules-cant-capture' },
      { kind: 'annotation', slug: 'the-matter-with-things' },
      { kind: 'annotation', slug: 'the-embodied-mind' },
      { kind: 'static', slug: 'third-enlightenment' },
    ],
  },
];
