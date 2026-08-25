export const siteFacts = {
  professionalHistory: 'fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge funds',
  education: 'management at Wharton and computer science through M&T',
  researchFocus: 'how organizations decide what deserves attention and which direction is worth pursuing when measurement cannot settle either question',
  yogaPractice: 'over a decade',
} as const;

interface PracticeClaims {
  router: {
    investing: PracticeRouteClaim;
    yoga: PracticeRouteClaim;
    coaching: PracticeRouteClaim;
    photography: PracticeRouteClaim;
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
    investing: {
      label: 'Organizations',
      title: 'Investing',
      href: '/research#investing-lens',
      summary: 'An investing lens shaped over fifteen years across private equity, venture capital, and hedge funds.',
    },
    yoga: {
      label: 'Body',
      title: 'Yoga',
      href: '/yoga',
      summary: 'What effort, balance, and release make visible in the body.',
    },
    coaching: {
      label: 'Decisions',
      title: 'Coaching',
      href: '/coaching',
      summary: 'What remains after fact and explanation have been separated.',
    },
    photography: {
      label: 'Seeing',
      title: 'Photography',
      href: '/photography',
      summary: 'A contact sheet of what held my attention long enough to make a frame.',
    },
  },
  researchMethod: 'My research begins where measurement stops being enough. Data can show whether a method worked; it cannot decide what an organization should value or which direction deserves commitment.',
  yogaMethod: 'I began yoga as physical exercise. More than a decade later, it has become a way to notice how effort narrows attention and how release changes what becomes available.',
  coachingMethod: 'A difficult decision often arrives with its explanation already attached: the market changed, the team failed, the timing was wrong. I use coaching to slow that story down. What happened? Which part is inference? What choice remains? The decision still belongs to the person who must live with it.',
  organizationalMethod: 'A system can preserve more context and still make an old premise easier to continue. The question is not only what the system can do. It is who may challenge the objective once the outputs begin to look like answers.',
  availability: {
    yoga: null,
    coaching: null,
  },
} as const satisfies PracticeClaims;

export const theoryClaims = {
  summary: 'A working theory about keeping premises revisable while holding a direction long enough to act.',
  homeEvidence: 'In my use, a system can retrieve a forgotten note quickly. Whether that note deserves another month of work remains my decision. That division is where the working theory begins.',
} as const;
