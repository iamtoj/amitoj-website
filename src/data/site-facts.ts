export const siteFacts = {
  professionalHistory: 'fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge fund',
  education: 'Wharton and M&T combined management and computer science',
  researchFocus: 'how people and organizations notice what matters, choose direction, and preserve judgment as cognition becomes delegable',
  yogaPractice: 'over a decade',
} as const;

interface PracticeClaims {
  router: {
    research: PracticeRouteClaim;
    yoga: PracticeRouteClaim;
    coaching: PracticeRouteClaim;
    organizational: PracticeRouteClaim;
  };
  researchMethod: string;
  yogaMethod: string;
  coachingMethod: string;
  organizationalMethod: string;
  availability: {
    yoga: null;
    coaching: null;
  };
}

interface PracticeRouteClaim {
  label: string;
  title: string;
  href: string;
  summary: string;
}

export const practiceClaims = {
  router: {
    research: {
      label: 'Organizational attention',
      title: 'Research',
      href: '/research',
      summary: 'Study how organizations allocate attention and find direction.',
    },
    yoga: {
      label: 'Embodied attention',
      title: 'Yoga',
      href: '/yoga',
      summary: 'Use effort and release to make attention visible through the body.',
    },
    coaching: {
      label: 'Decision practice',
      title: 'Coaching',
      href: '/coaching',
      summary: 'Separate what happened from the explanation already attached to it.',
    },
    organizational: {
      label: 'Judgment under delegation',
      title: 'Organizational work',
      href: '/research#organizational-work',
      summary: 'Ask who may revise the objective and what evidence can interrupt it.',
    },
  },
  researchMethod: 'My research examines how organizations allocate attention and find direction. It begins with questions that measurement alone cannot settle.',
  yogaMethod: 'Yoga is how I study the same questions I research — attention, effort, release — through the body instead of the literature.',
  coachingMethod: 'A difficult decision often arrives already explained: the market changed, the team failed, the timing was wrong. Coaching slows that explanation down. What happened? Which part is inference? What choice remains? The aim is not certainty. It is a decision someone can own, together with the evidence that should make them revise it.',
  organizationalMethod: 'A system can store more than any one person remembers and still preserve an old premise at greater speed. Whether that makes an organization less intelligent depends on how disagreement and revision are handled. The organizational question is where judgment lives—who may revise the objective, how disagreement survives synthesis, and what evidence is allowed to interrupt direction.',
  availability: {
    yoga: null,
    coaching: null,
  },
} as const satisfies PracticeClaims;

export const theoryClaims = {
  summary: 'A provisional theory about holding awareness and agency together as more cognition becomes delegable.',
  homeEvidence: 'In my use, a system can retrieve a forgotten note quickly. Whether that note deserves another month of work remains my decision. That division is where the working theory begins.',
} as const;
