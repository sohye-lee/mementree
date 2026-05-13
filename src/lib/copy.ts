// mementree — centralized user-facing copy.
// follows handoff/voice.md: lowercase, gardener metaphor (field/tree/memo/keeper/visitor),
// no exclamation marks, restraint.
//
// no ui component should hard-code user-facing strings. add them here.

export const copy = {
  brand: 'mementree',

  signIn: {
    topbarState: 'sign in',

    leftEyebrow: ['mementree', '00 — keep your field'],
    leftTitle: 'a quiet field, kept for you.',
    leftLede:
      'plant trees as projects, wishes, days. tie memos to their branches. come back from any device, any year, and the field will be where you left it.',
    leftLine:
      'a field is what you walk through —\nbut only if someone keeps it.',
    leftFoot: 'est. 2026',

    enter: {
      title: 'welcome back, or hello.',
      sub: 'plant a field, or return to the one you kept.',
      emailLabel: 'email',
      emailPlaceholder: 'you@somewhere.com',
      submit: 'send the link',
      submitting: 'sending…',
      footnote: "we'll send a single-use link. no password to remember.",
    },

    sent: {
      title: 'on its way.',
      sub: "if a field exists at that address — or one is ready to be planted — a link is heading there now. it'll work for 15 minutes.",
      back: 'back',
      retry: "didn't arrive? check the quiet folders, or try again in a minute.",
    },

    errors: {
      invalidEmail: "that doesn't look quite right.",
      sendFailed: 'something is taking longer than usual. try again?',
      callback: 'the link could not be verified. try sending a fresh one.',
    },
  },

  home: {
    signedInAs: 'signed in as',
    signOut: 'sign out',
  },
} as const;
