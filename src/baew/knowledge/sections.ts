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
    title: 'The Practice',
    node: '02',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 02, a reflection on trying different things without needing each one to become a skill or lasting interest.',
    explain:
      'The Practice is section 02. The author describes trying different things to find out what they are like, what can be learned from them and whether they belong in their life. Some interests last, while others are left behind.',
    recap: 'This is The Practice, section 02, about trying things and learning from them.',
    deeper: [
      {
        topic: 'contents',
        text: 'The section distinguishes things that become part of a routine, interests that fade once understood better, and experiences that still teach something even when the author never becomes particularly good at them.',
      },
      {
        topic: 'how',
        text: 'The emphasis is on exploration rather than achievement. An interest does not need to become a talent, a hobby or something the author can show other people.',
      },
      {
        topic: 'connections',
        text: 'It opens the Personal Record and is followed by Open Tabs, which shifts from trying things to the broader range of subjects that hold the author\'s attention.',
      },
    ],
    keywords: ['practice', 'trying', 'tried', 'interests', 'learning', 'talent', 'hobby', 'routine', 'explore', 'experience', '02'],
    related: ['things-i-do'],
  },

  {
    id: 'things-i-do',
    domIds: ['archive-one-things-i-do'],
    title: 'Open Tabs',
    node: '03',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 03, a broad list of interests that reflects the subjects currently holding the author\'s attention.',
    explain:
      'Open Tabs is section 03. The author lists interests ranging from games and music to animals, technology, conversations and things found online. The list is deliberately varied, and its changing nature is treated as part of the author\'s identity.',
    recap: 'This is Open Tabs, section 03, about a changing range of interests.',
    deeper: [
      {
        topic: 'contents',
        text: 'The section names games, music, animals, technology, good conversations and discoveries online. Each interest has its own reason for holding the author\'s attention.',
      },
      {
        topic: 'notes',
        text: 'Some interests remain part of the author\'s life, while others last only as long as curiosity does. The section does not suggest that every interest needs to become permanent.',
      },
      {
        topic: 'connections',
        text: 'It follows The Practice and leads into The Usual, which moves from broad interests to a few familiar personal preferences.',
      },
    ],
    keywords: ['open tabs', 'interests', 'games', 'music', 'animals', 'technology', 'conversations', 'online', 'curiosity', 'discoveries', '03'],
    related: ['favourites'],
  },

  {
    id: 'favourites',
    domIds: ['archive-one-favourites'],
    title: 'The Usual',
    node: '04',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 04, five familiar preferences: blue, milk and water, music, games and animals.',
    explain:
      'The Usual is section 04. It gathers five familiar preferences: the colour blue, milk and water, music, games and animals. The author names Kendrick among their favourite artists, lists several sports and games, and mentions the dogs and bunnies at home.',
    recap: 'This is The Usual, section 04, covering five familiar preferences.',
    deeper: [
      {
        topic: 'contents',
        text: 'Blue is described as a long-standing favourite colour, while milk and water are the author\'s usual drinks. The entries are straightforward and focus on preferences that have remained familiar.',
      },
      {
        topic: 'contents',
        text: 'The music entry names Kendrick as one favourite and describes a listening taste that moves across genres and artists. Some songs become associated with particular people, places and periods.',
      },
      {
        topic: 'contents',
        text: 'The games list includes volleyball, football, cricket, badminton, Free Fire, Roblox and Chess.com. The author remembers the people and shared nights more than individual scores.',
      },
      {
        topic: 'contents',
        text: 'The animals entry mentions the dogs and bunnies at home, describing how naturally they become part of everyday life and the feeling of home.',
      },
      {
        topic: 'connections',
        text: 'It follows Open Tabs and is followed by By Chance, moving from personal preferences to the friendships the author encountered.',
      },
    ],
    keywords: ['usual', 'favourites', 'favorites', 'favourite', 'favorite', 'colour', 'color', 'blue', 'milk', 'water', 'music', 'kendrick', 'games', 'animals', 'pets', 'dogs', 'bunnies', 'volleyball', 'football', 'cricket', 'badminton', 'free fire', 'roblox', 'chess.com', '04'],
    related: ['people'],
  },

  {
    id: 'people',
    domIds: ['archive-one-people'],
    title: 'By Chance',
    node: '05',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 05, about friendships that began through games and through meeting people in real life.',
    explain:
      'By Chance is section 05, the last section of the Personal Record. The author reflects on friends met through games and people met in real life, noting that each friendship is different and that none of these connections were planned.',
    recap: 'This is By Chance, section 05, about friendships that happened unexpectedly.',
    deeper: [
      {
        topic: 'contents',
        text: 'It describes friendships that began through games as well as people met in real life, without naming individuals or treating every connection as the same.',
      },
      {
        topic: 'notes',
        text: 'The author considers how easily these connections might never have happened and expresses appreciation that these particular friendships did.',
      },
      {
        topic: 'connections',
        text: 'It closes Interface 01. Interface 02 continues with everyday preferences and uncertainty before moving towards memories and questions.',
      },
    ],
    keywords: ['chance', 'people', 'friends', 'friendship', 'friendships', 'games', 'in real life', 'connections', 'circumstances', '05'],
    related: ['little-things'],
  },

  {
    id: 'little-things',
    domIds: ['archive-two-little-things'],
    title: 'Not Much to Explain',
    node: '06',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 06, a note that ordinary pleasures and everyday preferences do not need elaborate explanations.',
    explain:
      'Not Much to Explain is section 06, the first section of the Continuing Record. The author lists ordinary things that make a day better, including conversations, laughter, late-night gaming, music, discoveries and time with people they care about.',
    recap: 'This is Not Much to Explain, section 06, about ordinary things that make a day better.',
    deeper: [
      {
        topic: 'contents',
        text: 'The section includes good conversations, unexpected laughs, late-night gaming, finding something new, music and familiar things that feel personal to the author.',
      },
      {
        topic: 'notes',
        text: 'It closes by favouring uncomplicated things and saying that an experience does not need to carry a larger meaning to be enjoyable.',
      },
      {
        topic: 'connections',
        text: 'It opens Interface 02 and is followed by Some Days, which turns from everyday pleasures to uncertainty and personal change.',
      },
    ],
    keywords: ['not much to explain', 'explanation', 'ordinary', 'everyday', 'simple', 'conversations', 'laughter', 'late night', 'gaming', 'music', '06'],
    related: ['figuring-out'],
  },

  {
    id: 'figuring-out',
    domIds: ['archive-two-figuring-out'],
    title: 'Some Days',
    node: '07',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 07, about changing views, uncertainty and the parts of life the author is still working to improve.',
    explain:
      'Some Days is section 07. The author reflects on beliefs that have changed, things about themself that remain unclear and areas they hope to improve. The section leaves room for uncertainty rather than presenting personal growth as a finished process.',
    recap: 'This is Some Days, section 07, about change and uncertainty.',
    deeper: [
      {
        topic: 'contents',
        text: 'The author notes that some earlier beliefs would now receive different answers, while other questions about the self remain unresolved and some areas still need work.',
      },
      {
        topic: 'notes',
        text: 'The section contrasts days with a clear sense of direction and days without one. It treats not having every answer as a normal part of becoming.',
      },
      {
        topic: 'connections',
        text: 'It follows Not Much to Explain and leads into Only Later, which looks back at moments whose importance becomes clearer with time.',
      },
    ],
    keywords: ['some days', 'uncertainty', 'change', 'changing views', 'beliefs', 'growth', 'improve', 'direction', 'figuring out', '07'],
    related: ['things-i-like'],
  },

  {
    id: 'things-i-like',
    domIds: ['archive-two-things-i-like'],
    title: 'Only Later',
    node: '08',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 08, about ordinary moments and the people whose significance becomes clearer with time.',
    explain:
      'Only Later is section 08. The author looks back on ordinary days, conversations, late nights and games that only later began to feel important. The section also acknowledges people who stayed, left or became memories, alongside difficult experiences and mistakes.',
    recap: 'This is Only Later, section 08, about memories that gain meaning with time.',
    deeper: [
      {
        topic: 'contents',
        text: 'The section describes ordinary moments that were not recognised as important while they happened, including conversations, jokes, games and small details that later became missed.',
      },
      {
        topic: 'contents',
        text: 'It acknowledges that not everyone stayed and that some people had to be left behind. Others were part of the author\'s life for a time and eventually became memories.',
      },
      {
        topic: 'notes',
        text: 'The author includes difficult days and mistakes alongside happier memories, without treating the past as something that needs to be erased.',
      },
      {
        topic: 'connections',
        text: 'It follows Some Days and leads to Better Questions, the final numbered section, which shifts from looking back to examining ideas and beliefs.',
      },
    ],
    keywords: ['only later', 'memories', 'moments', 'past', 'conversations', 'late nights', 'people', 'mistakes', 'difficult days', '08'],
    related: ['memories'],
  },

  {
    id: 'memories',
    domIds: ['archive-two-memories'],
    title: 'Better Questions',
    node: '09',
    group: 'archive',
    access: 'open',
    localOnly: false,
    verification: 'verified',
    summary: 'Section 09, about understanding why ideas are true, examining opinions and recognising the limits of one\'s knowledge.',
    explain:
      'Better Questions is section 09, the final numbered section of the Archive. The author prefers to understand the reasons behind an idea rather than accept it on authority, and is interested in how people form beliefs and where personal understanding reaches its limits.',
    recap: 'This is Better Questions, section 09, about thinking things through for oneself.',
    deeper: [
      {
        topic: 'contents',
        text: 'The author says that looking into a claim can still lead to agreement, but wants the reasons behind an opinion to be understood rather than accepted without thought.',
      },
      {
        topic: 'contents',
        text: 'The section is interested in how people arrive at their beliefs, what shapes those beliefs and why things work the way they do.',
      },
      {
        topic: 'notes',
        text: 'It does not define intelligence as knowing everything. Instead, it values recognising the limits of one\'s understanding as a starting point for better questions.',
      },
      {
        topic: 'connections',
        text: 'It closes the eight numbered personal sections. The next area is the separate memory channel at node 10, which has its own access gate.',
      },
    ],
    keywords: ['better questions', 'questions', 'thinking', 'ideas', 'opinions', 'why', 'reason', 'believe', 'believes', 'believing', 'beliefs', 'understanding', 'intelligence', 'knowledge', '09'],
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
