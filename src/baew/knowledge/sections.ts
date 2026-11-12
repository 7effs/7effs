import type { SectionEntry } from './types.ts'

// Page order, top to bottom. Wording is Baew's own; it describes each area and never speaks as the author.

export const SECTIONS: SectionEntry[] = [
  {
    id: 'home',
    domIds: ['archive-home'],
    title: 'Homepage',
    group: 'main',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'The opening page of JAYE, with entrances to the Archive, the Cat chat and the Experimental Worlds puzzles.',
    explain:
      'This is the opening page of JAYE, a private archive described as “a private index of things unrecorded”. From here you can scroll into the Archive, talk to Effs’s Cat, or go straight to the Experimental Worlds puzzles.',
    recap: 'This is the opening page of JAYE.',
    welcome:
      'This is a private archive, described as “a private index of things unrecorded”. Scroll to enter the Archive, or tap me whenever you would like a section explained.',
    deeper: [
      {
        topic: 'contents',
        text: 'The page shows the JAYE title and two entry points. Cat AI is a chat marked “Ask anything”, and Experimental Worlds is marked “Logic · Patterns · Puzzles”. The prompt “Scroll to enter” leads into the Archive.',
      },
      {
        topic: 'how',
        text: 'Scrolling down is the main way in. The Archive begins with a gateway page where you choose one of two routes through the personal sections.',
      },
      {
        topic: 'actions',
        text: 'You can open the Cat chat or the Experimental Worlds challenge directly from this page, or scroll down and begin with the Archive.',
      },
      {
        topic: 'connections',
        text: 'The Cat chat is a separate feature with its own conversation. I am a separate guide, and I do not read or share what is said there.',
      },
    ],
    keywords: ['home', 'homepage', 'welcome', 'start', 'beginning', 'opening', 'landing', 'intro', 'first', 'top', 'jaye', 'index'],
    related: ['archive-gateway', 'cat-ai', 'the-impossible'],
  },

  {
    id: 'archive-gateway',
    domIds: ['archiveInterfaces'],
    title: 'The Archive',
    node: '01',
    group: 'main',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    approvedWording: true,
    summary: 'The central navigation space of JAYE, where you choose a route into the personal sections.',
    explain:
      'The Archive is the central navigation space of JAYE. It brings together different sections covering personal beliefs, interests, experiences, relationships, and memories. Each section explores a different subject, so you can choose where to begin and move through the collection at your own pace.',
    recap: 'This is the Archive gateway, where you choose a route.',
    deeper: [
      {
        topic: 'contents',
        text: 'There are two routes. Interface 01, The Personal Record, covers sections 02 to 05. Interface 02, The Continuing Record, labelled “Thoughts & Details”, covers sections 06 to 09.',
      },
      {
        topic: 'how',
        text: 'Each interface opens its own set of sections. Both have a link back to the main Archive and a link across to the other interface, so you can switch routes at any time.',
      },
      {
        topic: 'notes',
        text: 'The gateway describes the collection as having no feed and no algorithm, only what the author chose to keep.',
      },
    ],
    keywords: ['archive', 'gateway', 'interface', 'route', 'routes', 'personal', 'record', 'navigation', 'threshold', 'sections', 'menu'],
    related: ['beliefs', 'little-things'],
  },

  {
    id: 'beliefs',
    domIds: ['archive-one-beliefs'],
    title: 'Beliefs',
    node: '02',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 02, about how the author thinks: questioning, forming opinions and valuing curiosity.',
    explain:
      'Beliefs is section 02, the first of the Personal Record. The author describes a habit of thinking deeply, questioning what they are told and forming their own opinions, and says being smart means being curious enough to keep asking better questions rather than knowing everything.',
    recap: 'This is Beliefs, section 02, about how the author thinks.',
    deeper: [
      {
        topic: 'contents',
        text: 'It covers three ideas: an interest in how people think and why things work as they do, a preference for forming personal opinions over simply accepting them, and a definition of intelligence based on curiosity.',
      },
      {
        topic: 'how',
        text: 'It is a short written statement rather than an interactive feature, so there is nothing to click here. You read it in place and continue down the page.',
      },
      {
        topic: 'connections',
        text: 'Beliefs opens the Personal Record and sits with The Things I Do under the heading “Curiosity”. The sections after them move from ideas and activities to favourites and people.',
      },
    ],
    keywords: ['beliefs', 'belief', 'believe', 'believes', 'think', 'thinking', 'opinions', 'curious', 'curiosity', 'questions', 'ideas', 'mind', '02', 'smart', 'intelligence', 'knowing', 'asking'],
    related: ['things-i-do', 'archive-gateway'],
  },

  {
    id: 'things-i-do',
    domIds: ['archive-one-things-i-do'],
    title: 'The Things I Do',
    node: '03',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 03, a reflection on the many things the author has tried and what each taught them.',
    explain:
      'The Things I Do is section 03. The author reflects on the many things they have tried over the years: some stayed, some faded, and some taught them something without becoming a talent or hobby. It treats trying things as a way of learning rather than achieving.',
    recap: 'This is The Things I Do, section 03, about trying things and learning from them.',
    deeper: [
      {
        topic: 'contents',
        text: 'It separates things begun out of curiosity, things kept because they brought happiness, and a few left behind because they were not right. It ends by saying the author is still trying things and still changing their mind.',
      },
      {
        topic: 'how',
        text: 'It is a written reflection with nothing to interact with. The point is the attitude it describes: not everything has to become a skill or something to show people.',
      },
      {
        topic: 'connections',
        text: 'It follows Beliefs under the heading “Curiosity” and leads into A Favourites, which is more specific about what the author likes.',
      },
    ],
    keywords: ['things', 'do', 'tried', 'hobbies', 'hobby', 'activities', 'learning', 'talent', 'interests', '03', 'trying', 'started', 'kept', 'changing'],
    related: ['favourites', 'beliefs'],
  },

  {
    id: 'favourites',
    domIds: ['archive-one-favourites'],
    title: 'A Favourites',
    node: '04',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 04, a set of personal favourites: a colour, drinks, music, games and animals.',
    explain:
      'A Favourites is section 04. It presents personal favourites in five parts: the colour blue, milk and water as usual drinks, music, games, and animals. Each entry adds a short note on why it matters to the author.',
    recap: 'This is A Favourites, section 04: colour, drinks, music, games and animals.',
    deeper: [
      {
        topic: 'contents',
        text: 'Blue is described as a long-standing favourite colour, and milk and water as simple drinks the author never tires of. The theme is having a few plain things that stay constant.',
      },
      {
        topic: 'contents',
        text: 'On music, the author names Kendrick as one favourite but says their taste changes often across genres and artists. Some songs become attached to particular people, places and moments.',
      },
      {
        topic: 'contents',
        text: 'The games entry lists volleyball, football, cricket, badminton, Free Fire, Roblox and Chess.com, and says the people and the laughs are remembered more than the matches. The animals entry mentions dogs and bunnies at home.',
      },
      {
        topic: 'connections',
        text: 'It follows The Things I Do and sits with The People I Got Lucky With under the heading “What I Keep Close”.',
      },
    ],
    keywords: ['favourites', 'favorites', 'favourite', 'favorite', 'colour', 'color', 'blue', 'music', 'games', 'animals', 'drinks', 'kendrick', '04', 'milk', 'water', 'dogs', 'dog', 'bunnies', 'bunny', 'pets', 'volleyball', 'football', 'cricket', 'badminton', 'chess', 'roblox', 'free fire', 'genres', 'artists', 'sports'],
    related: ['people', 'things-i-do'],
  },

  {
    id: 'people',
    domIds: ['archive-one-people'],
    title: 'The People I Got Lucky With',
    node: '05',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 05, the author’s gratitude for the friends they have met in games and in person.',
    explain:
      'The People I Got Lucky With is section 05, the last of the Personal Record. The author expresses gratitude for friendships made both in games and in real life, across different places and stories, and says they do not take those people for granted.',
    recap: 'This is The People I Got Lucky With, section 05, about friendships.',
    deeper: [
      {
        topic: 'contents',
        text: 'It is brief and does not name individuals. It describes the friendships collectively and treats them as part of the author’s life.',
      },
      {
        topic: 'connections',
        text: 'It closes Interface 01, where it sits with A Favourites under the heading “What I Keep Close”. Interface 02, The Continuing Record, picks up with smaller details and with memories.',
      },
    ],
    keywords: ['people', 'friends', 'friendship', 'friendships', 'lucky', 'gratitude', 'blessed', 'relationships', '05', 'granted'],
    related: ['little-things', 'favourites'],
  },

  {
    id: 'little-things',
    domIds: ['archive-two-little-things'],
    title: 'Little Things',
    node: '06',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 06, the small everyday pleasures the author values.',
    explain:
      'Little Things is section 06, the first of the Continuing Record. The author says not everything needs a full explanation, and lists small pleasures that improve everyday life: good conversations, laughs, late-night gaming, discoveries, music and time with people they care about.',
    recap: 'This is Little Things, section 06, about small everyday pleasures.',
    deeper: [
      {
        topic: 'contents',
        text: 'It also mentions valuing simple things over complicated ones, and having things that feel personal. It closes on the idea that sometimes the little things are enough.',
      },
      {
        topic: 'how',
        text: 'It is a written section with nothing to interact with. It opens Interface 02, which continues the personal record in a lighter, more detailed way.',
      },
      {
        topic: 'connections',
        text: 'It opens Interface 02 and sits with Things I’m Still Figuring Out under the heading “Not the Whole Story”. That next section turns from small pleasures to open questions about the author themself.',
      },
    ],
    keywords: ['little', 'things', 'small', 'simple', 'everyday', 'pleasures', 'conversations', 'gaming', '06', 'complicated', 'explanation'],
    related: ['figuring-out', 'archive-gateway'],
  },

  {
    id: 'figuring-out',
    domIds: ['archive-two-figuring-out'],
    title: 'Things I’m Still Figuring Out',
    node: '07',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 07, an honest account of what the author has not yet worked out about themself.',
    explain:
      'Things I’m Still Figuring Out is section 07. The author says they do not have everything worked out and do not think they are supposed to. They are still learning about themself, changing their mind and growing, and accept that the full story is not settled yet.',
    recap: 'This is Things I’m Still Figuring Out, section 07, about being unfinished.',
    deeper: [
      {
        topic: 'contents',
        text: 'It describes some days of clear direction and others of none, and ends by saying it is acceptable not to have the whole story figured out yet.',
      },
      {
        topic: 'connections',
        text: 'It sits with Little Things under the heading “Not the Whole Story” and leads into Things I Like, which returns to what currently interests the author.',
      },
    ],
    keywords: ['figuring', 'figure', 'unsure', 'growing', 'growth', 'change', 'uncertain', 'learning', 'myself', '07', 'understand', 'story', 'becoming'],
    related: ['things-i-like', 'little-things'],
  },

  {
    id: 'things-i-like',
    domIds: ['archive-two-things-i-like'],
    title: 'Things I Like',
    node: '08',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 08, the interests the author is drawn to and why they change over time.',
    explain:
      'Things I Like is section 08. The author prefers things that genuinely interest them over things that merely look impressive, and names games, music, animals, technology, conversations and discoveries online. They add that their interests change over time.',
    recap: 'This is Things I Like, section 08, about current interests.',
    deeper: [
      {
        topic: 'contents',
        text: 'It ends by saying that having more than one side is part of who the author is, which is why the list of interests is left open.',
      },
      {
        topic: 'connections',
        text: 'It sits with Memories under the heading “Now and Then” and leads into it. Memories is the last of the numbered personal sections, so the Archive ends on remembered moments rather than on opinions.',
      },
    ],
    keywords: ['like', 'likes', 'interests', 'interest', 'technology', 'games', 'music', 'animals', 'hobbies', '08', 'explore', 'impressive'],
    related: ['memories', 'figuring-out'],
  },

  {
    id: 'memories',
    domIds: ['archive-two-memories'],
    title: 'Memories',
    node: '09',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 09, a reflection on moments that felt ordinary and the people who passed through them.',
    explain:
      'Memories is section 09. The author reflects on moments that felt ordinary while they happened, and on people who stayed, left or became memories. It acknowledges difficult days and mistakes alongside happy ones, and says the author would not erase any of them.',
    recap: 'This is Memories, section 09, the last of the personal sections.',
    deeper: [
      {
        topic: 'contents',
        text: 'It describes memories as pieces of people, places and moments that once meant something, some still close and some now far away.',
      },
      {
        topic: 'connections',
        text: 'It closes the numbered sections and sits with Things I Like under the heading “Now and Then”. After this section the page moves to a separate memory channel that sits behind a passphrase.',
      },
    ],
    keywords: ['memories', 'memory', 'remember', 'moments', 'past', 'nostalgia', 'people', '09', 'mistakes', 'difficult', 'erase', 'nights'],
    related: ['demi', 'things-i-like'],
  },

  {
    id: 'demi',
    domIds: ['demi-system'],
    title: 'Memory channel',
    aliases: ['Demi'],
    node: '10',
    group: 'special',
    access: 'gated',
    localOnly: true,
    verification: 'partial',
    summary: 'Node 10, a memory channel presented as the last memory, which needs a passphrase to open.',
    explain:
      'This is node 10, a memory channel presented as the last memory in the Archive. It sits behind a passphrase, so its contents are only open to visitors who have been given access. I can describe the doorway, but I cannot open it or share what is inside.',
    recap: 'This is the passphrase-protected memory channel.',
    deeper: [
      {
        topic: 'how',
        text: 'Choosing “Enter memory system” opens a prompt that asks for a passphrase. Without it the memory stays closed. I do not have the passphrase, and I never see or store what you type.',
      },
      {
        topic: 'notes',
        text: 'Some controls on this channel are for the site owner only. I do not describe or operate them.',
      },
      {
        topic: 'connections',
        text: 'Leaving the memory channel returns you to the page and unlocks the section called After the Memory, which stays locked until then.',
      },
    ],
    keywords: ['demi', 'memory', 'channel', 'passphrase', 'password', 'locked', 'gate', 'secret', 'private', 'unlock', 'last memory', '10'],
    related: ['after-memory', 'memories'],
  },

  {
    id: 'after-memory',
    domIds: ['after-demi'],
    title: 'After the Memory',
    node: '11',
    group: 'special',
    access: 'gated',
    localOnly: true,
    verification: 'partial',
    summary: 'Section 11, a transition that stays locked until the visitor returns from the memory channel.',
    explain:
      'After the Memory is section 11, a transition that follows the memory channel. It starts locked and opens when you return from that channel. Its heading, “The story stays. The system moves.”, marks the shift from the personal record to the interactive systems that come next.',
    recap: 'This is After the Memory, the transition that follows the memory channel.',
    deeper: [
      {
        topic: 'how',
        text: 'There is no separate way to open it. Returning from the memory channel is the only doorway into this section.',
      },
      {
        topic: 'connections',
        text: 'The interactive systems that follow begin with the Cat chat and continue into Parent Space, the Anomaly Protocol and The Impossible.',
      },
    ],
    keywords: ['after', 'memory', 'transition', 'continuation', 'system', 'locked', 'story', 'section 11', '11'],
    related: ['cat-ai', 'demi'],
  },

  {
    id: 'cat-ai',
    domIds: ['nodeAISection'],
    title: 'Talk to Effs’s Cat',
    group: 'systems',
    access: 'open',
    localOnly: true,
    verification: 'verified',
    summary: 'An interactive chat with Effs’s Cat, with several reply styles and quick prompts.',
    explain:
      'Talk to Effs’s Cat is an interactive chat. You can write a message, choose the style of reply, or use a quick prompt such as Read the room, Continue the story, Connect the clues, A new omen, or Generate whisper. The Cat is a separate system from me.',
    recap: 'This is the Cat chat, a separate system from me.',
    deeper: [
      {
        topic: 'how',
        text: 'Reply styles are Balanced, Storyteller, Detective or clue-focused, Direct answers, and Poetic or cryptic. There is also an option to include page context, and the conversation is remembered for the session.',
      },
      {
        topic: 'actions',
        text: 'You can copy the transcript or clear the conversation. A message can be up to 1,200 characters, and Enter sends it while Shift and Enter adds a new line.',
      },
      {
        topic: 'notes',
        text: 'The page itself states that live replies depend on a configured secure backend, and that API keys stay on the server.',
      },
      {
        topic: 'connections',
        text: 'The Cat has its own conversation and memory. I do not read its messages or share anything with it.',
      },
    ],
    keywords: ['cat', 'chat', 'effs', 'talk', 'ai', 'conversation', 'whisper', 'omen', 'storyteller', 'detective', 'assistant'],
    related: ['parent-space', 'home'],
  },

  {
    id: 'parent-space',
    domIds: ['parent-interface-entry-wrap', 'parent-space-view'],
    title: 'Parent Space',
    node: '12 to 13',
    group: 'systems',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'A dedicated workspace that joins two linked systems: the Evidence Archive and the Inference Engine.',
    explain:
      'Parent Space is a dedicated workspace that joins two linked systems: the Evidence Archive and the Inference Engine. The first presents case files to read, and the second tests claims against that evidence. Open it with “Enter the Parent Space”, and use Return to come back.',
    recap: 'This is Parent Space, which holds the Evidence Archive and the Inference Engine.',
    deeper: [
      {
        topic: 'how',
        text: 'Inside, a navigation bar switches between node 12, the Evidence Archive, and node 13, the Inference Engine. The route it describes is to inspect what is documented, then examine what the evidence can support.',
      },
      {
        topic: 'connections',
        text: 'The Anomaly Protocol and The Impossible, at nodes 14 and 15, are separate sections outside Parent Space.',
      },
    ],
    keywords: ['parent', 'space', 'workspace', 'enter', 'evidence', 'inference', 'dual', 'systems', 'nodes', '12', '13'],
    related: ['evidence-archive', 'inference-engine'],
  },

  {
    id: 'evidence-archive',
    domIds: ['postAI-signal-room'],
    title: 'The Evidence Archive',
    node: '12',
    group: 'systems',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Node 12, eight case files of competing accounts and records, resolved one at a time.',
    explain:
      'The Evidence Archive is node 12, a set of eight case files made of competing accounts and records that do not quite agree. You read the dossier, then resolve the case by choosing the claim that the cited record actually justifies. Completing a case unlocks the next one.',
    recap: 'This is the Evidence Archive, node 12: eight cases to read and resolve.',
    deeper: [
      {
        topic: 'contents',
        text: 'Each case has a title, a subject area, a timeline, witness statements and an evidence register with reference codes. The first, The Unlit Observatory, concerns a room reported sealed before its lamp was recorded as switched off.',
      },
      {
        topic: 'how',
        text: 'Only the first case is open at the start. The other seven stay sealed until the one before is resolved, and a cross-reference becomes readable once the case it points to is unlocked.',
      },
      {
        topic: 'actions',
        text: 'You can write notebook entries with separate observation and interpretation fields, saved locally on your device. You can also export or import your investigation, filter cases by status, and switch between English and Hindi.',
      },
      {
        topic: 'connections',
        text: 'Its cases feed the Inference Engine, which reads the same case model. A case you study here appears there as a timeline you can test claims against.',
      },
    ],
    keywords: ['evidence', 'archive', 'case', 'cases', 'dossier', 'witness', 'investigation', 'notebook', 'clue', 'timeline', 'observatory', 'casework', '12'],
    related: ['inference-engine', 'parent-space'],
  },

  {
    id: 'inference-engine',
    domIds: ['postAI-second-reading'],
    title: 'The Inference Engine',
    node: '13',
    group: 'systems',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Node 13, a rule-based tool for testing claims against the evidence of an Evidence Archive case.',
    explain:
      'The Inference Engine is node 13. It builds a timeline from an Evidence Archive case, then lets you test a claim against the evidence and see a rule-based status. Its aim is to keep facts separate from interpretation, because claims require support.',
    recap: 'This is the Inference Engine, node 13: test a claim against the evidence.',
    deeper: [
      {
        topic: 'how',
        text: 'Select a claim, link the evidence that bears on it, and the engine shows its status under fixed rules. A status such as Contradicted comes with a short explanation of the record it conflicts with.',
      },
      {
        topic: 'contents',
        text: 'There are four statuses. Established means directly supported by a record or a consistent, explicit chain. Contradicted means it conflicts with a verified record or an explicit impossibility.',
      },
      {
        topic: 'contents',
        text: 'Undetermined means the available record cannot decide the claim either way. Unsupported attribution means a conclusion about intent or identity cannot be drawn from resemblance or absence alone.',
      },
      {
        topic: 'connections',
        text: 'It uses an Evidence Archive case as its source, so the two nodes work as one route: inspect the record first, then test the conclusion. A reasoning history section records the steps you take.',
      },
    ],
    keywords: ['inference', 'engine', 'claim', 'claims', 'verdict', 'status', 'established', 'contradicted', 'undetermined', 'unsupported', 'reasoning', 'logic', 'timeline', '13'],
    related: ['anomaly-protocol', 'evidence-archive'],
  },

  {
    id: 'anomaly-protocol',
    domIds: ['postAI-reading-memory'],
    title: 'The Anomaly Protocol',
    node: '14',
    group: 'systems',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Node 14, five analytical instruments with ten rule-checked challenges, run locally.',
    explain:
      'The Anomaly Protocol is node 14, a set of five analytical instruments with ten challenges in total. Each module has its own rules, and your answers are checked by fixed, deterministic validation that explains the result. It runs locally and keeps its own progress.',
    recap: 'This is the Anomaly Protocol, node 14: five instruments, ten challenges.',
    deeper: [
      {
        topic: 'contents',
        text: 'The modules are Contradiction Lab, Constraint Chamber, Pattern Anomaly, Impossible Protocol and Counterexample Terminal. A typical challenge asks whether a pair of statements is a contradiction, is compatible, or cannot be determined.',
      },
      {
        topic: 'how',
        text: 'Submitting an answer returns a validation and an explanation. The checks are rule-based rather than generative AI, so the same answer always gets the same result.',
      },
      {
        topic: 'actions',
        text: 'You can export a protocol record and import it later, and switch between English and Hindi. Progress belongs only to this system and does not read or change the Evidence Archive cases.',
      },
      {
        topic: 'connections',
        text: 'It follows Parent Space but is independent of it, and it leads on to The Impossible at node 15.',
      },
    ],
    keywords: ['anomaly', 'protocol', 'contradiction', 'lab', 'constraint', 'chamber', 'pattern', 'counterexample', 'terminal', 'challenge', 'challenges', 'modules', 'logic', '14'],
    related: ['the-impossible', 'inference-engine'],
  },

  {
    id: 'the-impossible',
    domIds: ['postAI-impossible'],
    title: 'The Impossible',
    node: '15',
    group: 'systems',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Node 15, a puzzle game in the Experimental Worlds area with a pattern mode and a logic mode.',
    explain:
      'The Impossible is node 15, in the Experimental Worlds area. It is a puzzle game with two modes: Pattern & Sequence, where you find the hidden rule, and Logic & Deduction, where you prove what follows. There is no timer and no penalty for thinking.',
    recap: 'This is The Impossible, node 15: a two-mode puzzle game.',
    deeper: [
      {
        topic: 'how',
        text: 'Select “Enter the challenge”, choose a mode and a difficulty, and begin. The screen tracks the round, your score, your best score and the rounds you have cleared, and “Reset this mode” clears it.',
      },
      {
        topic: 'notes',
        text: 'The page states that it is a local challenge engine. No AI is involved and it makes no external requests.',
      },
      {
        topic: 'connections',
        text: 'The homepage links straight to it through the Experimental Worlds entry, and the Glimpse listening room follows it.',
      },
    ],
    keywords: ['impossible', 'game', 'puzzle', 'puzzles', 'play', 'experimental', 'worlds', 'pattern', 'sequence', 'logic', 'deduction', 'challenge', 'score', '15'],
    related: ['glimpse', 'anomaly-protocol'],
  },

  {
    id: 'glimpse',
    domIds: ['glimpse'],
    title: 'Glimpse',
    group: 'other',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'A listening room labelled “Vol. 01 / two pieces”, with a Side A and a Side B.',
    explain:
      'Glimpse is a listening room labelled “Vol. 01 / two pieces”. It offers two audio pieces, Side A and Side B. The page asks you to select a side and listen closely, and each side has its own play button.',
    recap: 'This is Glimpse, the listening room with two pieces.',
    deeper: [
      {
        topic: 'how',
        text: 'Tap play on either side to start it. The audio is only loaded when you press play, so nothing is downloaded until you choose to listen.',
      },
      {
        topic: 'notes',
        text: 'The room is described as private. It is the last feature on the page before the footer.',
      },
    ],
    keywords: ['glimpse', 'listening', 'music', 'audio', 'songs', 'song', 'track', 'tracks', 'side', 'play', 'player', 'listen'],
    related: ['footer', 'the-impossible'],
  },

  {
    id: 'footer',
    domIds: [],
    title: 'Footer and links',
    group: 'other',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'The end of the page, which credits the site, plus a social link near the top.',
    explain:
      'The footer is the end of the page, and credits the site as made by @cvechz. A separate social link near the top of the page opens an Instagram profile.',
    recap: 'This is the footer, the end of the page.',
    deeper: [
      {
        topic: 'connections',
        text: 'Scroll back up to return to the homepage, or revisit any section above. Everything on the page runs from top to bottom in the order the Archive describes.',
      },
    ],
    keywords: ['footer', 'credit', 'credits', 'made', 'maker', 'instagram', 'social', 'contact', 'end', 'bottom'],
    related: ['home'],
  },
]
