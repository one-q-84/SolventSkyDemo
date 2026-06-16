// ── Story content — edit narrative lines and earth object descriptions here ──

const STORY_SECTIONS = [
  {
    id: 'opening',
    lines: [
      { text: 'From nothing, a sensation of space emerges around you.', cls: '' },
      { text: 'You\'re floating, glowing, suspended in blackness,', cls: '' },
      { text: 'and can see lightyears worth of sparkling dust.', cls: '' },
      { text: 'You don\'t have the vocabulary for it yet,', cls: 'semi-dim' },
      { text: 'but the only word for your situation is', cls: 'semi-dim' },
      { text: 'peace.', cls: 'emphasis' },
    ],
    prompt: 'GO, WANDER THE STARS',
    trigger: 'spring'
  },
  {
    id: 'seraphs-arrive',
    lines: [
      { text: 'A pair of red and blue nebulas emerge in your presence.', cls: '' },
      { text: 'We\'re seraphs...celestial bodies.', cls: 'speaker-blue' },
      { text: 'We want to offer you another form.', cls: 'speaker-red' },
      { text: 'Another form?', cls: 'speaker-self' },
      { text: 'There\'s a body on Earth which your spirit would perfectly match.', cls: 'speaker-red' },
      { text: 'What\'s their name?', cls: 'speaker-self' },
      { text: 'Albion. Albion Lummox.', cls: 'speaker-blue' },
      { text: '...', cls: 'speaker-self' },
      { text: 'What if I want to remain here?', cls: 'speaker-self' },
    ]
  },
  {
    id: 'the-offer',
    lines: [
      { text: 'There are two paths for you.', cls: 'speaker-red' },
      { text: 'Wait enough years and your dust catches fire —', cls: 'speaker-red' },
      { text: 'you burn for billions of years,', cls: 'speaker-red' },
      { text: 'attracting another Earth, a hoard of people,', cls: 'speaker-red' },
      { text: 'to relish in your warmth.', cls: 'speaker-red' },
      { text: 'Or accept a match on Earth', cls: 'speaker-red' },
      { text: 'and experience the short, wondrous life of a human.', cls: 'speaker-red' },
      { text: 'Is living truly that wonderful?', cls: 'speaker-self' },
    ]
  },
  {
    id: 'blue-speech',
    lines: [
      { text: 'The most marvelous experience.', cls: 'speaker-blue' },
      { text: 'Remain here and survival is just a matter of physics and gravity.', cls: 'speaker-blue' },
      { text: 'A steady, predictable existence.', cls: 'speaker-blue' },
      { text: 'On Earth the possibilities are immeasurable.', cls: 'speaker-blue emphasis' },
      { text: 'It\'s a thrilling journey —', cls: 'speaker-blue' },
      { text: 'one that should not commence unless one is absolutely certain', cls: 'speaker-blue' },
      { text: 'they\'re ready for personhood.', cls: 'speaker-blue' },
    ]
  },
  {
    id: 'time-speech',
    lines: [
      { text: 'The days will be tough.', cls: 'speaker-blue' },
      { text: 'Days when you wish away your own life.', cls: 'speaker-blue' },
      { text: 'But you must remember this moment in those moments —', cls: 'speaker-blue' },
      { text: 'that long before you were born,', cls: 'speaker-blue' },
      { text: 'you chose yourself.', cls: 'speaker-blue emphasis' },
      { text: 'The most sensational minute is the sensation of its seconds,', cls: 'speaker-blue' },
      { text: 'your inexorable connection with time,', cls: 'speaker-blue' },
      { text: 'through which all of life has onced, currently, and will traverse.', cls: 'speaker-blue' },
    ]
  },
  {
    id: 't-and-time',
    lines: [
      { text: 'Is this where T went?', cls: 'speaker-self' },
      { text: 'T did accept. That\'s all I can tell you.', cls: 'speaker-blue' },
      { text: 'I contemplated what it meant to become a subject of time.', cls: '' },
      { text: 'For in the stars, seasons cycle with the millennia.', cls: '' },
      { text: 'What, I asked aloud,', cls: 'speaker-self' },
      { text: 'could be so temporarily joyful to rob me of this eternity?', cls: 'speaker-self' },
      { text: 'Life, the blue orb laughed. Life!', cls: 'speaker-blue emphasis' },
    ]
  },
  {
    id: 'decision-pressure',
    lines: [
      { text: 'We\'re on Earth\'s timeline.', cls: 'speaker-red' },
      { text: 'A decision has to be made in six weeks.', cls: 'speaker-red' },
      { text: 'Six? How long is —', cls: 'speaker-self' },
      { text: '42 spins of the Earth.', cls: 'speaker-red' },
      { text: 'That\'s nothing!', cls: 'speaker-self' },
      { text: 'That\'s all the time there is.', cls: 'speaker-red' },
      { text: 'Fine. So who am I next?', cls: 'speaker-self' },
      { text: 'Am I wanted?', cls: 'speaker-self emphasis' },
      { text: 'Yes. Your mother is thrilled.', cls: 'speaker-red' },
      { text: 'And my father?', cls: 'speaker-self' },
      { text: 'He needs someone like you. Come, take a look.', cls: 'speaker-blue' },
    ],
    prompt: null,
    trigger: 'earth'
  },
  {
    id: 'hesitation',
    lines: [
      { text: 'What if I say no?', cls: 'speaker-self' },
      { text: 'You\'ll wait for the next selection.', cls: 'speaker-blue' },
      { text: 'Remember — you only enter Earth once.', cls: 'speaker-blue' },
      { text: 'Wait until it\'s perfect.', cls: 'speaker-blue' },
      { text: 'Until even your existence as a star pales in comparison', cls: 'speaker-blue' },
      { text: 'to the life that awaits you.', cls: 'speaker-blue' },
    ]
  },
  {
    id: 'the-longing',
    lines: [
      { text: 'Whatever the imperfections that coincide with humanness,', cls: '' },
      { text: 'there was a richness that no nameless, timeless entity could grasp.', cls: '' },
      { text: 'To know the preciousness of a definite existence.', cls: '' },
      { text: 'There would never be another chance...', cls: 'emphasis' },
      { text: 'to live as Albion Lummox.', cls: 'emphasis' },
      { text: 'Never again a chance to shine on Earth', cls: '' },
      { text: 'as I did in the darkest corners of the universe.', cls: '' },
    ]
  },
  {
    id: 'final-moment',
    lines: [
      { text: 'It\'s time.', cls: 'speaker-blue' },
      { text: 'Now?', cls: 'speaker-self' },
      { text: 'Now.', cls: 'speaker-red emphasis' },
      { text: 'What happens when I exit?', cls: 'speaker-self' },
      { text: 'It\'s going to hurt.', cls: 'speaker-blue' },
      { text: 'Hurt?', cls: 'speaker-self' },
      { text: 'Albion,', cls: 'speaker-red' },
      { text: 'knowing all of that awaits you —', cls: 'speaker-red' },
      { text: 'do you still want to enter Earth?', cls: 'speaker-red emphasis' },
    ],
    trigger: 'choice'
  }
];

const EARTH_OBJECTS = [
  { name: 'Cathode Ray Television', description: 'The TV to you is living proof of teleportation. A sign that no matter how far away you are from home, you could always be broadcasted within it.', scale: 2.8, rotationY: 0, offsetX: -1.2, offsetY: -0.1, file: '/crt_tv.glb' },
  { name: 'A Letter From War', description: 'The letter is tear-stained. You can’t recall why, but seeing it now, even for the first time, makes you ill.', scale: 6.0, rotationY: 0, file: '/postcard.glb' },
  { name: 'AR-15 Assault Rifle', description: 'The instrument of warfare has entered the home, the streets, the living nightmare of what it means to walk the world. ', scale: 0.33, rotationY: 0, file: '/rifle.glb' },
  { name: 'Cassette Player', description: 'A deep nostalgia rises at the the thought of music. It is the one thing you could never experience if you remained a star, stuck in space, where sound waves fly flat.', scale: 6.5, rotationY: 0, file: '/player.glb' },
  { name: 'Ghostly Apparitions', description: 'The horrors of the past promise to haunt you. Should you choose life on earth, you must understand whose domain bellies under the sky, where spirit and flesh collide.', scale: 0.009, rotationY: 0, offsetX: 1.2, offsetY: -0.1, file: '/ghost.glb' },
];

export { STORY_SECTIONS, EARTH_OBJECTS };
