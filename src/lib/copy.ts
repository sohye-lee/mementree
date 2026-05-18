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

  toast: {
    planted: 'planted', // ` · {name}` appended at call site
    memoTied: 'memo tied',
    treeWithered: 'tree withered · in recently fallen',
    memoFell: 'memo let fall · in recently fallen',
    treeLifted: 'tree lifted back up',
    memoLifted: 'memo lifted back up',
  },

  footer: {
    seasonPlaceholder: '—',
    phasePlaceholder: '—',
    trees: 'trees',
    memos: 'memos',
    recenter: '↑ recenter',
    hint: { walk: 'walk', look: 'look', tree: 'tree' },
    // env strip is clickable to resolve real location (geolocation opt-in)
    locateTitle: 'use my location',
  },

  index: {
    title: '[ index ]',
    searchPlaceholder: 'search trees, memos…',
    plant: '+ plant a tree',
    empty: 'no trees yet.',
    noMatch: 'nothing matches.',
    memoCountSuffix: 'memos',
  },

  plant: {
    cancel: 'cancel',
    submitting: 'planting…',

    // first tree (onboarding) — only shown when the field has no mode yet
    first: {
      eyebrow: ['mementree', '00 — empty'],
      title: 'an empty field.',
      lede:
        'before anything else, plant the first tree.\nthe kind of tree you choose shapes what this field becomes.',
      section1: '[ 01 ] what kind of tree?',
      section2: '[ 02 ] name the first tree',
      submit: 'plant the first tree',
      foot: 'you can plant more whenever. the field grows with you.',
    },

    // subsequent trees — same modal, lighter framing
    again: {
      // %mode% is replaced at render time
      title: 'plant a %mode%',
      lede:
        'a tree is a project. once planted, the team can tie memos to its branches.',
      submit: 'plant',
      foot: 'tree shape is generated from the name. same name → same shape.',
    },

    // the four modes — picked once for the field, then frozen
    modes: {
      project: {
        glyph: '◐',
        name: 'a project',
        desc: 'things you build with others. each tree is one. memos are milestones, decisions, what the team learned.',
      },
      wish: {
        glyph: '✦',
        name: 'a wish',
        desc: "plant one wish tree and tie wishes — yours, or anyone you invite.",
      },
      diary: {
        glyph: '●',
        name: 'a diary',
        desc: 'one tree per month. each day a memo. walk back through the year by walking the field.',
      },
      note: {
        glyph: '○',
        name: 'a notebook',
        desc: 'freeform. trees are topics, memos are scraps. for thinking, reading, collecting.',
      },
    },

    fields: {
      name: { label: 'name', placeholder: 'e.g. my project' },
      year: { label: 'year', placeholder: '2026' },
      lead: { label: 'lead', placeholder: 'who tended it' },
      brief: { label: 'brief', placeholder: 'one or two lines. what was it.' },
    },

    fab: 'plant a tree',

    errors: {
      nameRequired: 'a name, however small.',
      modeRequired: 'pick a kind of tree.',
      serverError: 'something held the field back. try again?',
    },
  },

  detail: {
    modeWord: {
      project: 'project',
      wish: 'wish',
      diary: 'diary',
      note: 'notebook',
    },
    metaYear: 'year',
    metaLead: 'lead',
    metaMemos: 'memos',
    memosLabel: 'memos',
    memosEmpty: 'nothing tied here yet.',
    descPlaceholder: '—',
    closeLabel: 'close',
    witherButton: '↓ wither',
    letMemoFall: '↓ let fall',
    anon: 'anon',

    composer: {
      title: '+ tie a memo to this tree',
      authorPlaceholder: 'your name',
      textPlaceholder:
        'what we did, what we learned, what we wished — keep it small.',
      submit: 'tie memo',
      submitting: 'tying…',
      charsRemaining: 'chars',
      errors: {
        textRequired: 'a few words at least.',
        serverError: 'the field paused. try again.',
      },
    },
  },

  confirm: {
    witherTree: {
      title: 'let this tree go?',
      body: "the tree withers in place. memos drift to the ground. you have thirty days to lift it back up — after that, it returns to the field as soil.",
      cancel: 'keep it',
      confirm: 'let it fall',
    },
    letMemoFall: {
      title: 'let this memo fall?',
      body: "it'll rest in recently fallen for thirty days. lift it back up before then, or it turns to soil.",
      cancel: 'keep it',
      confirm: 'let it fall',
    },
  },

  fallen: {
    navLabel: '↓ fallen',
    eyebrow: 'recently fallen',
    title: "what's been let go.",
    sub: 'memos drift to the ground. trees wither in place. anything here can be brought back within thirty days, then it returns to the field as soil.',
    closeLabel: 'close',
    empty:
      "nothing fallen yet.\nwhen you let a tree wither or a memo fall, it rests here for thirty days.",
    kindTree: 'tree',
    kindMemo: 'memo',
    actionRestore: '↑ lift back up',
  },
} as const;
