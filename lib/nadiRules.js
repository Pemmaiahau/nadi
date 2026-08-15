/**
 * Bhrigu Nadi rule database + parser.
 *
 * Bhrigu Nadi (the Bhrigu Nandi Nadi stream) reads a chart through
 * planet-to-planet links rather than through the Ascendant and dashas:
 *
 *   - Conjunction  : planets in the same sign
 *   - Trine (1/5/9): planets 5 or 9 signs apart are treated as conjunct
 *   - 2nd / 12th   : the 2nd sign from a planet shows its future,
 *                    the 12th sign from it shows its past
 *   - 7th          : direct mutual aspect
 *
 * All distances are whole-sign. Degrees are used only to grade how tight a
 * link is, never to decide whether it exists.
 *
 * The reading corpus below is an editable baseline written in the Bhrigu Nadi
 * idiom - treat it as a starting dictionary to tune, not as scripture.
 */

import { PLANET_ORDER, SIGNS, houseFrom, angularSeparation, ordinalSuffix } from './constants.js';

/* -------------------------------------------------------------------------- */
/* 1. Significators (karakas)                                                 */
/* -------------------------------------------------------------------------- */

export const SIGNIFICATORS = {
  Sun: {
    primary: 'Soul, father, government, authority',
    keywords: ['soul', 'father', 'ego', 'authority', 'government', 'vitality', 'status'],
    role: 'The self as position and recognition.',
  },
  Moon: {
    primary: 'Mind, mother, emotions, public',
    keywords: ['mind', 'mother', 'emotion', 'home', 'public', 'nourishment'],
    role: 'The moving mind; also the timing device of the chart.',
  },
  Mars: {
    primary: 'Energy, husband, brother, land, courage',
    keywords: ['energy', 'husband', 'brother', 'land', 'machinery', 'surgery', 'courage', 'anger'],
    role: 'Applied force. In a female chart it also signifies the husband.',
  },
  Mercury: {
    primary: 'Intellect, business, communication',
    keywords: ['intellect', 'business', 'trade', 'writing', 'analysis', 'friends', 'skill'],
    role: 'The calculating, transacting mind.',
  },
  Jupiter: {
    primary: 'The native (male), husband, wisdom, children, expansion',
    keywords: ['self', 'guru', 'wisdom', 'children', 'dharma', 'finance', 'growth'],
    role: 'In Bhrigu Nadi, Jupiter is read as the native himself in a male chart, and as the husband in a female chart.',
  },
  Venus: {
    primary: 'The native (female), wife, wealth, comfort, art',
    keywords: ['wife', 'wealth', 'luxury', 'art', 'vehicles', 'pleasure', 'relationship'],
    role: 'In Bhrigu Nadi, Venus is read as the native herself in a female chart, and as the wife in a male chart.',
  },
  Saturn: {
    primary: 'Karma, profession, discipline, delay, service',
    keywords: ['karma', 'profession', 'labour', 'delay', 'structure', 'longevity', 'servants'],
    role: 'The work a life is actually made of; the great slow teacher.',
  },
  Rahu: {
    primary: 'Foreign, illusion, massive expansion, obsession',
    keywords: ['foreign', 'illusion', 'expansion', 'technology', 'shortcuts', 'ambition', 'maya'],
    role: 'Amplifies whatever it touches, without discrimination.',
  },
  Ketu: {
    primary: 'Liberation, blockage, roots, detachment',
    keywords: ['moksha', 'blockage', 'past life', 'detachment', 'occult', 'sudden loss', 'mastery'],
    role: 'Cuts, dissolves and perfects; gives mastery through renunciation.',
  },
};

/* -------------------------------------------------------------------------- */
/* 2. Conjunction / trine readings - all 36 planetary pairs                   */
/* -------------------------------------------------------------------------- */

/**
 * Keys are normalised as `A|B` with A,B in PLANET_ORDER sequence.
 * polarity: 'benefic' | 'mixed' | 'challenging' (used only for UI colour)
 */
export const CONJUNCTION_RULES = {
  'Sun|Moon': {
    theme: 'Mind & Identity',
    polarity: 'mixed',
    text: 'Soul and mind fused. Strong will and a restless inner life; the native identifies heavily with their own moods. Mother and father karma are tightly linked, and one of them dominates the early narrative.',
    tags: ['willpower', 'parents', 'restlessness'],
  },
  'Sun|Mars': {
    theme: 'Drive & Authority',
    polarity: 'mixed',
    text: 'Commanding, combative vitality. Suited to defence, police, surgery, sport, engineering and any authority won by force of effort. Ego and temper flare quickly; friction with the father or with superiors is common.',
    tags: ['leadership', 'surgery', 'defence', 'temper'],
  },
  'Sun|Mercury': {
    theme: 'Intellect & Status',
    polarity: 'benefic',
    text: 'Budhaditya-type intelligence: the native earns position through communication, analysis or administration. Government service, accountancy, teaching and consultancy suit. Speech carries authority.',
    tags: ['administration', 'communication', 'government'],
  },
  'Sun|Jupiter': {
    theme: 'Self & Dharma',
    polarity: 'benefic',
    text: 'The native rises through principle, advice and reputation rather than aggression. Strong father figure or a mentor who behaves like one. Advisory, legal, academic and policy roles are favoured; pride in being right is the weakness.',
    tags: ['mentor', 'law', 'reputation', 'father'],
  },
  'Sun|Venus': {
    theme: 'Status & Comfort',
    polarity: 'mixed',
    text: 'Position gained through art, beauty, media, luxury or diplomacy. Attraction to refinement and public admiration. In a male chart the wife is dignified and status-conscious; ego frequently enters the marriage.',
    tags: ['art', 'media', 'luxury', 'marriage'],
  },
  'Sun|Saturn': {
    theme: 'Karma & Authority',
    polarity: 'challenging',
    text: 'The classic hard-work signature. Recognition arrives late and only after sustained labour; authority is resented and then inherited. Distance, duty or disappointment with the father. Excellent for administration, iron, mining, labour-heavy industry and long institutional careers.',
    tags: ['delay', 'discipline', 'father', 'institution'],
  },
  'Sun|Rahu': {
    theme: 'Ambition & Illusion',
    polarity: 'challenging',
    text: 'Enormous ambition for position, often through unconventional or foreign channels. Sudden rises and equally sudden exposure. Reputation is volatile; the native is drawn to image and can mistake visibility for substance.',
    tags: ['foreign', 'fame', 'volatility', 'politics'],
  },
  'Sun|Ketu': {
    theme: 'Identity & Detachment',
    polarity: 'challenging',
    text: 'The ego is repeatedly cut down until the native stops needing credit. Disinterest in titles, and a pull towards research, occult study or solitary expertise. Health or distance issues concerning the father.',
    tags: ['research', 'detachment', 'father', 'occult'],
  },

  'Moon|Mars': {
    theme: 'Emotion & Force',
    polarity: 'mixed',
    text: 'Chandra-Mangala: emotionally driven earning capacity. Sharp, impatient, entrepreneurial mind, good with property, trade and anything requiring nerve. Mood swings and irritability with the mother or with women in general.',
    tags: ['earning', 'property', 'impatience'],
  },
  'Moon|Mercury': {
    theme: 'Mind & Commerce',
    polarity: 'benefic',
    text: 'A quick, adaptable, commercially alert mind. Excellent for trade, media, writing, teaching and negotiation. Thinks aloud, changes opinion easily, and needs constant mental stimulation.',
    tags: ['trade', 'writing', 'adaptability'],
  },
  'Moon|Jupiter': {
    theme: 'Wisdom & Wellbeing',
    polarity: 'benefic',
    text: 'Gaja-Kesari-type protection. Broad, generous, morally anchored mind with good instincts about people. Support from mother and from teachers; comfort tends to arrive without desperate struggle. Complacency is the risk.',
    tags: ['protection', 'teaching', 'mother', 'optimism'],
  },
  'Moon|Venus': {
    theme: 'Comfort & Affection',
    polarity: 'benefic',
    text: 'Refined, affectionate and comfort-seeking temperament. Attraction to art, music, decor and pleasant surroundings. Strong bond with the mother and with the spouse; emotional dependence on being liked.',
    tags: ['art', 'comfort', 'affection'],
  },
  'Moon|Saturn': {
    theme: 'Mind & Burden',
    polarity: 'challenging',
    text: 'Vish-yoga signature: a serious, heavy, self-doubting mind that matures early through hardship. Loneliness even in company, and responsibility carried from childhood. Extremely durable once the pessimism is managed; suits research, service and long-haul work.',
    tags: ['depression', 'endurance', 'responsibility', 'mother'],
  },
  'Moon|Rahu': {
    theme: 'Imagination & Illusion',
    polarity: 'challenging',
    text: 'A vividly imaginative but easily deluded mind. Anxiety, strange dreams, fascination with the foreign and the taboo. Powerful for mass-facing work - media, marketing, crowds - provided the native separates fantasy from plan.',
    tags: ['anxiety', 'media', 'foreign', 'imagination'],
  },
  'Moon|Ketu': {
    theme: 'Mind & Renunciation',
    polarity: 'challenging',
    text: 'Emotional detachment, often preceded by an early separation or loss involving the mother or home. Intuitive, sometimes psychic, uninterested in ordinary emotional transactions. Strong for spiritual practice and for healing work.',
    tags: ['detachment', 'intuition', 'mother', 'moksha'],
  },

  'Mars|Mercury': {
    theme: 'Technical Intellect',
    polarity: 'mixed',
    text: 'Sharp, argumentative, technically capable mind. Excellent for engineering, surgery, coding, mathematics, law and any trade needing precision under pressure. Speech can cut; the native wins arguments and loses allies.',
    tags: ['engineering', 'coding', 'law', 'sharp speech'],
  },
  'Mars|Jupiter': {
    theme: 'Career & Temperament',
    polarity: 'mixed',
    text: 'Highly energetic and technically minded, with real potential in engineering, medicine, defence or any applied science. Acts on principle and acts fast - the same haste that produces results also produces avoidable mistakes.',
    tags: ['engineering', 'medicine', 'haste', 'energy'],
  },
  'Mars|Venus': {
    theme: 'Passion & Relationship',
    polarity: 'mixed',
    text: 'Strong passion and physical magnetism; artistic work with a mechanical or physical edge. Relationships begin intensely and are prone to friction. In a male chart, the wife is strong-willed; in a female chart, an assertive husband.',
    tags: ['passion', 'conflict', 'attraction', 'art'],
  },
  'Mars|Saturn': {
    theme: 'Hard Karma',
    polarity: 'challenging',
    text: 'Force meeting restriction - the native works under pressure, often physically or in dangerous, technical or heavily regulated fields. Machinery, construction, metals, defence, surgery. Suppressed anger, accidents and disputes over land or property need watching.',
    tags: ['machinery', 'construction', 'accidents', 'disputes'],
  },
  'Mars|Rahu': {
    theme: 'Explosive Expansion',
    polarity: 'challenging',
    text: 'Extreme drive with poor brakes. Capacity for enormous output, risk-taking and unconventional technical work; also a genuine signature for accidents, litigation, surgery and burnt bridges. Excellent in crisis, dangerous in routine.',
    tags: ['risk', 'technology', 'accidents', 'ambition'],
  },
  'Mars|Ketu': {
    theme: 'Sharp Blockage',
    polarity: 'challenging',
    text: 'Piercing, weapon-like energy that either specialises brilliantly or destroys abruptly. Surgeons, martial artists, investigators and occultists carry this. Sudden endings to efforts; injuries and a hot, unstable temperament.',
    tags: ['surgery', 'occult', 'injury', 'mastery'],
  },

  'Mercury|Jupiter': {
    theme: 'Knowledge & Counsel',
    polarity: 'benefic',
    text: 'The teacher-consultant combination: analysis married to wisdom. Publishing, education, law, finance, advisory and editorial work all suit. Tends to over-theorise and delay committing to action.',
    tags: ['teaching', 'publishing', 'finance', 'advisory'],
  },
  'Mercury|Venus': {
    theme: 'Business & Art',
    polarity: 'benefic',
    text: 'Commercial instinct with aesthetic taste - design, fashion, media, luxury retail, entertainment and brokerage. Charming, persuasive, socially fluent. Money comes through communication and other people.',
    tags: ['business', 'design', 'media', 'persuasion'],
  },
  'Mercury|Saturn': {
    theme: 'Structured Intellect',
    polarity: 'mixed',
    text: 'Slow, methodical, exacting mind with excellent long-term concentration. Suited to research, accountancy, law, systems, quality control and administration. Speech is guarded; the native under-sells themselves and matures late intellectually.',
    tags: ['research', 'accountancy', 'systems', 'caution'],
  },
  'Mercury|Rahu': {
    theme: 'Clever Expansion',
    polarity: 'mixed',
    text: 'Brilliant, unorthodox, fast-talking intelligence with a taste for shortcuts. Superb for technology, trading, marketing and anything foreign. The same wiring produces exaggeration, over-commitment and, at worst, misrepresentation.',
    tags: ['technology', 'trading', 'marketing', 'exaggeration'],
  },
  'Mercury|Ketu': {
    theme: 'Deep Analysis',
    polarity: 'mixed',
    text: 'Penetrating but non-verbal intelligence - understands far more than it explains. Strong for research, mathematics, mantra, coding and diagnostics. Communication gaps, indecision and disinterest in ordinary business chatter.',
    tags: ['research', 'mathematics', 'silence', 'diagnostics'],
  },

  'Jupiter|Venus': {
    theme: 'Native & Partner',
    polarity: 'mixed',
    text: 'The two chart-significators of self and spouse joined - a primary marriage and wealth link. Refined values, a life oriented around partnership, teaching or finance. Guru-Shukra together can also mean conflicting value systems inside the marriage.',
    tags: ['marriage', 'wealth', 'values', 'partnership'],
  },
  'Jupiter|Saturn': {
    theme: 'Self & Profession',
    polarity: 'mixed',
    text: 'The native and their karma joined: profession becomes identity. Steady, structured, responsible growth - success arrives through sustained institutional effort rather than luck. Career-defining phases repeat whenever these two meet again by transit.',
    tags: ['career', 'discipline', 'institution', 'growth'],
  },
  'Jupiter|Rahu': {
    theme: 'Guru Chandala',
    polarity: 'challenging',
    text: 'Unconventional beliefs and enormous, sometimes ungrounded, expansion of the self. Foreign connections, unorthodox teachers, and success in scale-driven fields. Warns against inflated advice, guru-disillusionment and ethical shortcuts.',
    tags: ['foreign', 'unorthodox', 'expansion', 'ethics'],
  },
  'Jupiter|Ketu': {
    theme: 'Wisdom & Renunciation',
    polarity: 'mixed',
    text: 'Innate spiritual maturity; the native outgrows conventional ambition. Strong for philosophy, healing, research and traditional knowledge. Detachment from children, wealth or worldly recognition is a recurring theme.',
    tags: ['spirituality', 'philosophy', 'detachment', 'healing'],
  },

  'Venus|Saturn': {
    theme: 'Wealth Through Work',
    polarity: 'mixed',
    text: 'Wealth generated through profession - a possible luxury trade, creative career or service business built slowly and kept. Discipline applied to art or to money. Delay or age-gap in marriage, and a partner who is serious rather than playful.',
    tags: ['wealth', 'luxury trade', 'creative career', 'late marriage'],
  },
  'Venus|Rahu': {
    theme: 'Desire & Excess',
    polarity: 'challenging',
    text: 'Magnified desire: attraction to foreign partners, unconventional relationships, glamour, and rapid material gain. Excellent for entertainment, fashion and export trade. Overindulgence and reputational risk through relationships or money.',
    tags: ['glamour', 'foreign spouse', 'excess', 'entertainment'],
  },
  'Venus|Ketu': {
    theme: 'Detached Love',
    polarity: 'challenging',
    text: 'Dissatisfaction inside relationships even when nothing is visibly wrong; separation, celibacy or a spiritually oriented partner. Artistically gifted with a refined, otherworldly taste. Money comes and dissolves unless consciously anchored.',
    tags: ['separation', 'dissatisfaction', 'art', 'detachment'],
  },

  'Saturn|Rahu': {
    theme: 'Karma & Illusion',
    polarity: 'challenging',
    text: 'Heavy, unconventional karma: foreign work, mass systems, industrial scale, or careers with hidden pressure. Chronic anxiety about security. Great endurance for grinding, unglamorous work that eventually pays disproportionately.',
    tags: ['foreign work', 'industry', 'anxiety', 'endurance'],
  },
  'Saturn|Ketu': {
    theme: 'Career Renunciation',
    polarity: 'challenging',
    text: 'Obstacles in early career and a persistent desire to quit mundane jobs. Pulls towards spiritual, hidden or esoteric professions - research, healing, mysticism, back-office or solitary technical work. Once the native stops chasing status, mastery follows.',
    tags: ['obstacles', 'esoteric profession', 'quitting', 'mastery'],
  },

  'Rahu|Ketu': {
    theme: 'Axis',
    polarity: 'mixed',
    text: 'The nodal axis itself. Rahu and Ketu are permanently opposite, so this pair is read as the 7th-house axis of the chart rather than as a conjunction: what the native grasps at (Rahu) versus what they must release (Ketu).',
    tags: ['axis', 'karma'],
  },
};

/* -------------------------------------------------------------------------- */
/* 3. 7th house (direct aspect) readings                                      */
/* -------------------------------------------------------------------------- */

/** Curated oppositions; anything unlisted falls back to a generated reading. */
export const OPPOSITION_RULES = {
  'Sun|Saturn': {
    theme: 'Authority Opposed',
    polarity: 'challenging',
    text: 'A lifelong tension between the native\'s authority and their duty. Superiors block, then eventually endorse. Recognition is earned in the second half of life.',
    tags: ['authority', 'delay'],
  },
  'Sun|Moon': {
    theme: 'Full Moon Axis',
    polarity: 'mixed',
    text: 'Purnima-type polarity: strong personality with a visible split between public role and private feeling. Parents pull in different directions.',
    tags: ['polarity', 'parents'],
  },
  'Moon|Saturn': {
    theme: 'Mind Under Weight',
    polarity: 'challenging',
    text: 'The mind is held to account from the outside. Emotional restraint, chronic seriousness, and steady maturity through obligation.',
    tags: ['restraint', 'maturity'],
  },
  'Jupiter|Saturn': {
    theme: 'Self vs Karma',
    polarity: 'mixed',
    text: 'The native and their profession sit opposite each other - work demands what the self resists. Growth comes precisely at that friction point.',
    tags: ['career', 'friction'],
  },
  'Jupiter|Venus': {
    theme: 'Partnership Axis',
    polarity: 'mixed',
    text: 'A defining partnership axis: the spouse mirrors what the native lacks. Strong marriage significance, with differing value systems to reconcile.',
    tags: ['marriage', 'complementarity'],
  },
  'Mars|Saturn': {
    theme: 'Force vs Restraint',
    polarity: 'challenging',
    text: 'Effort meets resistance head-on. Physically demanding or heavily regulated work; disputes that drag. Patience is the entire lesson.',
    tags: ['resistance', 'disputes'],
  },
  'Venus|Saturn': {
    theme: 'Love Across Distance',
    polarity: 'challenging',
    text: 'Marriage marked by distance, duty or delay. Affection expressed as reliability rather than romance.',
    tags: ['marriage', 'duty'],
  },
  'Venus|Mars': {
    theme: 'Attraction Axis',
    polarity: 'mixed',
    text: 'Magnetic but combustible attraction. Relationships are the arena where the native learns negotiation.',
    tags: ['attraction', 'conflict'],
  },
  'Jupiter|Rahu': {
    theme: 'Belief Under Pressure',
    polarity: 'challenging',
    text: 'Convictions are repeatedly tested by worldly temptation. Foreign or unorthodox influences confront inherited beliefs.',
    tags: ['belief', 'foreign'],
  },
  'Moon|Rahu': {
    theme: 'Mind vs Illusion',
    polarity: 'challenging',
    text: 'The mind is pulled outward by craving and crowd opinion. Powerful public instinct paired with private restlessness.',
    tags: ['anxiety', 'public'],
  },
  'Sun|Rahu': {
    theme: 'Eclipse Axis',
    polarity: 'challenging',
    text: 'Identity and image compete. Visibility arrives in bursts and can obscure the actual self; father-related distance is common.',
    tags: ['image', 'father'],
  },
  'Mercury|Jupiter': {
    theme: 'Detail vs Big Picture',
    polarity: 'mixed',
    text: 'Analysis and wisdom argue with each other. Excellent advisory capacity once the native stops mistaking detail for judgement.',
    tags: ['advisory', 'analysis'],
  },
  'Rahu|Ketu': {
    theme: 'The Karmic Axis',
    polarity: 'mixed',
    text: 'The chart\'s fundamental karmic axis: the direction of hunger versus the direction of release. Every other opposition is read against it.',
    tags: ['karma', 'axis'],
  },
};

/* -------------------------------------------------------------------------- */
/* 4. 2nd house (future) and 12th house (past) readings                       */
/* -------------------------------------------------------------------------- */

/**
 * Keyed `base>other`, i.e. `other` sits in the 2nd sign from `base`.
 * Unlisted combinations are generated from the significator table.
 */
export const SECOND_HOUSE_RULES = {
  'Jupiter>Saturn': 'The native\'s future is written in work. Profession, responsibility and institutional duty become the dominant theme of the coming chapters of life.',
  'Jupiter>Venus': 'Marriage, wealth and comfort lie ahead of the native. A partnership or a significant financial gain shapes the next phase.',
  'Jupiter>Rahu': 'The future carries foreign exposure and rapid, outsized expansion - relocation, scale, or an unconventional path the native has not yet imagined.',
  'Jupiter>Ketu': 'The future bends towards detachment: withdrawal from a role the native currently values, and a turn to inner or research-led work.',
  'Jupiter>Mars': 'Energy, property and technical effort define the future. A physically or technically demanding chapter is approaching.',
  'Jupiter>Sun': 'Position, recognition and dealings with authority lie ahead. The native moves closer to a formal seat of responsibility.',
  'Jupiter>Moon': 'Domestic life, mother, and emotional settlement are the coming theme - a home, a family phase, or public-facing work.',
  'Jupiter>Mercury': 'Business, learning and communication shape the future. A skill or trade becomes the vehicle of the next phase.',
  'Venus>Saturn': 'For the spouse or for wealth, work and delay lie ahead - money will be earned rather than received, and the partner carries duty.',
  'Venus>Rahu': 'The future of relationship and wealth involves foreign elements, unconventional arrangements or sudden inflation of desire.',
  'Venus>Ketu': 'Detachment lies in the future of the relationship or of the wealth already accumulated. Something in that area is due to be released.',
  'Venus>Jupiter': 'The partner\'s future is expansive and dharmic - growth in status, children, or shared purpose.',
  'Saturn>Rahu': 'The profession expands abnormally in the future - foreign work, scale, technology or a jump the native did not plan.',
  'Saturn>Ketu': 'The current profession is heading towards dissolution. A break, exit or radical simplification of work lies ahead.',
  'Saturn>Jupiter': 'Karma matures into wisdom: the profession eventually confers authority, advisory standing or teaching.',
  'Saturn>Venus': 'Work leads to wealth and comfort - the profession is the source of future material ease.',
  'Saturn>Sun': 'Future profession moves towards authority, government or formal position.',
  'Saturn>Mars': 'The coming work is technical, physical or competitive - machinery, land, defence or execution under pressure.',
  'Sun>Saturn': 'The father\'s or the native\'s authority is heading into a phase of duty and constraint.',
  'Moon>Rahu': 'The mind\'s future is restless and outward-bound - travel, crowds, or a fixation not yet formed.',
  'Moon>Saturn': 'Emotional life moves towards responsibility and, for a time, austerity.',
  'Mars>Saturn': 'Energy will be channelled into structured, professional work - the raw drive gets a job.',
  'Mercury>Rahu': 'Business and intellect expand rapidly in the future, likely through technology or foreign markets.',
  'Mercury>Venus': 'Commerce turns towards art, luxury or partnership-driven trade.',
  'Rahu>Jupiter': 'Ambition eventually finds a philosophy - the expansion becomes principled.',
  'Ketu>Jupiter': 'What was renounced returns as wisdom the native can teach.',
};

/** Keyed `base>other`, i.e. `other` sits in the 12th sign from `base`. */
export const TWELFTH_HOUSE_RULES = {
  'Jupiter>Saturn': 'The native comes from hard work and constraint. Early life carried duty, scarcity or a demanding elder; the discipline learned there is permanent.',
  'Jupiter>Venus': 'A past shaped by comfort, affection or an earlier relationship. Wealth or a partner belongs to the story already lived.',
  'Jupiter>Rahu': 'The past holds foreign influence, upheaval or an ambition the native has already burned through.',
  'Jupiter>Ketu': 'Deep past-life spiritual conditioning. The native arrives already detached from something most people are still chasing.',
  'Jupiter>Mars': 'A past defined by struggle, physical effort, siblings or property matters.',
  'Jupiter>Sun': 'The father, or an early authority figure, dominates the native\'s background.',
  'Jupiter>Moon': 'The mother and the emotional atmosphere of childhood are the formative influence.',
  'Jupiter>Mercury': 'Education, trade or an early business environment shaped the native\'s foundations.',
  'Venus>Saturn': 'The relationship or the wealth has hardship behind it - a partner who worked, or money that was slow to arrive.',
  'Venus>Ketu': 'A prior separation, loss or renunciation sits behind the current relationship.',
  'Venus>Rahu': 'A foreign or unconventional attachment belongs to the past of this relationship.',
  'Saturn>Ketu': 'The profession has a dissolved past - an earlier career, training or role that was abandoned.',
  'Saturn>Rahu': 'Past work involved foreign settings, scale or an unorthodox route into the field.',
  'Saturn>Jupiter': 'The native\'s own past efforts built the profession they now hold.',
  'Saturn>Venus': 'Earlier comfort or family money underwrote the current professional position.',
  'Saturn>Sun': 'An institutional or paternal authority stands behind the native\'s working life.',
  'Moon>Ketu': 'Emotional history contains an early separation, and the mind has already learned to let go.',
  'Moon>Saturn': 'A childhood carrying more responsibility than it should have.',
  'Sun>Ketu': 'A father figure who was absent, ascetic, or lost early.',
  'Mars>Ketu': 'Past injuries, surgeries or abruptly ended conflicts leave their mark on the native\'s drive.',
  'Mercury>Saturn': 'Learning was slow, formal or hard-won in the past - and is therefore solid.',
  'Rahu>Saturn': 'The current ambition grew directly out of past constraint.',
  'Ketu>Venus': 'Comfort and pleasure already tasted and set down; the native is not chasing them again.',
};

/* -------------------------------------------------------------------------- */
/* 5. Three-planet yogas                                                      */
/* -------------------------------------------------------------------------- */

export const TRIPLE_RULES = [
  {
    id: 'triple-jup-sat-ketu',
    planets: ['Jupiter', 'Saturn', 'Ketu'],
    title: 'Jupiter + Saturn + Ketu',
    theme: 'Renunciation of Career',
    polarity: 'challenging',
    text: 'The strongest Bhrigu Nadi signature for walking away from a settled profession. The native builds a career, masters it, then loses interest entirely - typically turning to spiritual, research or service work.',
    tags: ['renunciation', 'career change', 'spirituality'],
  },
  {
    id: 'triple-jup-ven-rahu',
    planets: ['Jupiter', 'Venus', 'Rahu'],
    title: 'Jupiter + Venus + Rahu',
    theme: 'Unconventional Marriage & Wealth',
    polarity: 'mixed',
    text: 'Marriage across community, caste or country, and wealth that arrives in unusual bursts. Great material promise with a matching capacity for overreach.',
    tags: ['foreign marriage', 'wealth', 'unconventional'],
  },
  {
    id: 'triple-jup-sat-rahu',
    planets: ['Jupiter', 'Saturn', 'Rahu'],
    title: 'Jupiter + Saturn + Rahu',
    theme: 'Large-Scale Profession',
    polarity: 'mixed',
    text: 'The native\'s work operates at scale - industry, technology, foreign postings or mass systems. Heavy responsibility, chronic pressure, and disproportionate eventual reward.',
    tags: ['industry', 'foreign work', 'scale'],
  },
  {
    id: 'triple-sun-sat-mars',
    planets: ['Sun', 'Saturn', 'Mars'],
    title: 'Sun + Saturn + Mars',
    theme: 'Hard Authority',
    polarity: 'challenging',
    text: 'Authority won through conflict and endurance. Defence, police, engineering, surgery, heavy industry. Persistent friction with superiors and with the father.',
    tags: ['defence', 'conflict', 'authority'],
  },
  {
    id: 'triple-ven-mars-rahu',
    planets: ['Venus', 'Mars', 'Rahu'],
    title: 'Venus + Mars + Rahu',
    theme: 'Intense Desire',
    polarity: 'challenging',
    text: 'Powerful, impulsive attraction and a relationship life that runs hot. Strong creative and physical output; scandal and impulsive commitments are the risk.',
    tags: ['passion', 'impulse', 'creativity'],
  },
  {
    id: 'triple-moon-rahu-sat',
    planets: ['Moon', 'Rahu', 'Saturn'],
    title: 'Moon + Rahu + Saturn',
    theme: 'Mental Pressure',
    polarity: 'challenging',
    text: 'A mind under sustained strain - anxiety, insomnia, and a tendency to catastrophise. Also unusually resilient once the native learns structure and stops feeding the fear.',
    tags: ['anxiety', 'resilience', 'insomnia'],
  },
  {
    id: 'triple-jup-mer-sun',
    planets: ['Jupiter', 'Mercury', 'Sun'],
    title: 'Jupiter + Mercury + Sun',
    theme: 'Scholar in Office',
    polarity: 'benefic',
    text: 'Intelligence recognised by institutions. Academia, administration, law, policy and advisory positions; the native is trusted for judgement.',
    tags: ['academia', 'administration', 'advisory'],
  },
  {
    id: 'triple-sat-ven-mer',
    planets: ['Saturn', 'Venus', 'Mercury'],
    title: 'Saturn + Venus + Mercury',
    theme: 'Commercial Craft',
    polarity: 'benefic',
    text: 'Money made by disciplined skill - design, luxury trade, finance, manufacturing of refined goods. Slow to start, durable once established.',
    tags: ['business', 'design', 'finance'],
  },
  {
    id: 'triple-jup-mars-sat',
    planets: ['Jupiter', 'Mars', 'Saturn'],
    title: 'Jupiter + Mars + Saturn',
    theme: 'Technical Career',
    polarity: 'mixed',
    text: 'Engineering, medicine, construction or defence pursued as a lifelong profession. Enormous work capacity; the native rarely rests and can grind themselves down.',
    tags: ['engineering', 'medicine', 'overwork'],
  },
  {
    id: 'triple-sun-moon-rahu',
    planets: ['Sun', 'Moon', 'Rahu'],
    title: 'Sun + Moon + Rahu',
    theme: 'Eclipse-Born Ambition',
    polarity: 'challenging',
    text: 'Identity and mind both amplified by Rahu - magnetic public presence, unstable inner life. Fame is possible and so is a fall; both arrive faster than expected.',
    tags: ['fame', 'instability', 'public'],
  },
  {
    id: 'triple-ven-sat-ketu',
    planets: ['Venus', 'Saturn', 'Ketu'],
    title: 'Venus + Saturn + Ketu',
    theme: 'Withdrawal from Relationship',
    polarity: 'challenging',
    text: 'Marriage delayed, austere, or eventually set aside. Strong for celibate, monastic or entirely work-absorbed lives, and for art produced in solitude.',
    tags: ['late marriage', 'separation', 'solitude'],
  },
  {
    id: 'triple-mer-rahu-sat',
    planets: ['Mercury', 'Rahu', 'Saturn'],
    title: 'Mercury + Rahu + Saturn',
    theme: 'Systems & Scale',
    polarity: 'mixed',
    text: 'Technology, data, logistics and large commercial systems. Exceptional problem-solving under constraint; ethical corner-cutting is the standing temptation.',
    tags: ['technology', 'logistics', 'systems'],
  },
  {
    id: 'triple-jup-moon-ven',
    planets: ['Jupiter', 'Moon', 'Venus'],
    title: 'Jupiter + Moon + Venus',
    theme: 'Grace & Comfort',
    polarity: 'benefic',
    text: 'A protected, well-liked life with genuine material and emotional comfort. Teaching, counselling, art and hospitality suit. Effort is the missing ingredient, not luck.',
    tags: ['comfort', 'popularity', 'counselling'],
  },
  {
    id: 'triple-mars-ketu-sat',
    planets: ['Mars', 'Ketu', 'Saturn'],
    title: 'Mars + Ketu + Saturn',
    theme: 'Severed Effort',
    polarity: 'challenging',
    text: 'Efforts are repeatedly cut short until the native narrows to one specialisation. Surgery, forensics, mining, martial disciplines and occult practice all sit here.',
    tags: ['specialisation', 'obstacles', 'occult'],
  },
];

/* -------------------------------------------------------------------------- */
/* 6. Lagna-anchored layer                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Bhrigu Nadi de-emphasises the Ascendant, but the standard Vedic layer still
 * matters - and it is the layer that actually moves during rectification,
 * since the Lagna advances a whole sign roughly every two hours. These
 * readings are what make the BTR slider meaningful.
 */
export const HOUSE_SIGNIFICATIONS = [
  { house: 1, name: 'Tanu', label: 'Self & Body', text: 'body, temperament, the way the native is seen' },
  { house: 2, name: 'Dhana', label: 'Wealth & Speech', text: 'accumulated wealth, speech, family of origin, food' },
  { house: 3, name: 'Sahaja', label: 'Courage & Siblings', text: 'initiative, siblings, short travel, skill of hand' },
  { house: 4, name: 'Sukha', label: 'Home & Mother', text: 'mother, property, vehicles, inner peace, schooling' },
  { house: 5, name: 'Putra', label: 'Intelligence & Children', text: 'children, creativity, speculation, past merit' },
  { house: 6, name: 'Ari', label: 'Service & Obstacles', text: 'debt, disease, enemies, daily service, competition' },
  { house: 7, name: 'Yuvati', label: 'Partnership', text: 'marriage, business partners, public dealings' },
  { house: 8, name: 'Randhra', label: 'Crisis & Depth', text: 'longevity, inheritance, upheaval, hidden matters, occult' },
  { house: 9, name: 'Dharma', label: 'Fortune & Belief', text: 'father, guru, long travel, fortune, higher principle' },
  { house: 10, name: 'Karma', label: 'Career & Status', text: 'profession, public standing, authority, action in the world' },
  { house: 11, name: 'Labha', label: 'Gains & Network', text: 'income, elder siblings, friends, fulfilment of desire' },
  { house: 12, name: 'Vyaya', label: 'Loss & Liberation', text: 'expenditure, foreign lands, isolation, sleep, moksha' },
];

/** Planet conjunct or trine the Ascendant. */
export const LAGNA_LINK_RULES = {
  Sun: {
    theme: 'Self & Authority',
    polarity: 'mixed',
    text: 'The soul-significator falls on the rising degree. Strong sense of self, natural authority, and a life organised around being seen as competent. Pride is the standing weakness.',
  },
  Moon: {
    theme: 'Self & Mind',
    polarity: 'benefic',
    text: 'The mind and the body-significator coincide. Emotionally responsive, adaptable, and visibly affected by mood; the public reads the native accurately.',
  },
  Mars: {
    theme: 'Self & Force',
    polarity: 'mixed',
    text: 'Physical vigour and a combative front. The native pushes first and negotiates later - excellent for competitive and technical work, hard on close relationships.',
  },
  Mercury: {
    theme: 'Self & Intellect',
    polarity: 'benefic',
    text: 'Identity is built out of communication and skill. Youthful appearance, quick speech, and a life that runs on information.',
  },
  Jupiter: {
    theme: 'Self on Self',
    polarity: 'benefic',
    text: 'The Nadi significator of the native himself sits on the Ascendant - an unusually strong self-signature. Principled, expansive, trusted for judgement, prone to weight both physical and moral.',
  },
  Venus: {
    theme: 'Self & Refinement',
    polarity: 'benefic',
    text: 'Personal charm, aesthetic sense, and a body oriented to comfort. In a female chart this is a very strong self-signature; in a male chart the spouse strongly colours the identity.',
  },
  Saturn: {
    theme: 'Self & Karma',
    polarity: 'challenging',
    text: 'Karma sits on the body. A serious, aged-early bearing, chronic sense of duty, and slow but permanent achievement. Health and confidence both improve after the mid-thirties.',
  },
  Rahu: {
    theme: 'Self & Illusion',
    polarity: 'challenging',
    text: 'The identity is amplified and slightly unreal. Magnetic, unconventional presence with a persistent gap between the image projected and the person behind it.',
  },
  Ketu: {
    theme: 'Self & Detachment',
    polarity: 'challenging',
    text: 'The native does not fully inhabit their own persona. Self-doubt alternating with sudden mastery; a body that signals its own impermanence.',
  },
};

/* -------------------------------------------------------------------------- */
/* 7. Transit (Gochar) rules - Bhrigu Nadi style                              */
/* -------------------------------------------------------------------------- */

/** Keyed `transitPlanet>natalPlanet`. */
export const TRANSIT_RULES = {
  'Saturn>Jupiter': {
    title: 'Saturn transiting natal Jupiter',
    severity: 'major',
    text: 'Major career and life-shift phase. Karma lands directly on the native: responsibilities are restructured, a role ends or hardens, and whatever is not built on real work falls away. Classic period for a job change, relocation or a sober re-founding of the life.',
  },
  'Saturn>Venus': {
    title: 'Saturn transiting natal Venus',
    severity: 'major',
    text: 'Pressure on relationship and money. Marriage matters turn serious - commitment, distance or duty. Wealth requires discipline; impulsive spending is punished.',
  },
  'Saturn>Sun': {
    title: 'Saturn transiting natal Sun',
    severity: 'major',
    text: 'Authority is tested. Friction with superiors, government or the father; energy runs low. Position gained now is slow but keeps.',
  },
  'Saturn>Moon': {
    title: 'Saturn transiting natal Moon',
    severity: 'major',
    text: 'The Sade Sati core. Emotional weight, isolation and a demand for maturity. Domestic and mental adjustments dominate; the mind is rebuilt on a firmer base.',
  },
  'Saturn>Mars': {
    title: 'Saturn transiting natal Mars',
    severity: 'caution',
    text: 'Energy meets a wall. Frustration, disputes, property friction and higher accident risk. Deliberate, unhurried action is the only workable strategy.',
  },
  'Saturn>Mercury': {
    title: 'Saturn transiting natal Mercury',
    severity: 'moderate',
    text: 'Business and communication slow down and get audited. Excellent for deep study and for fixing systems; poor for quick deals.',
  },
  'Saturn>Rahu': {
    title: 'Saturn transiting natal Rahu',
    severity: 'moderate',
    text: 'Ambition is forced through a narrow gate. Foreign or unconventional plans face delay and paperwork; what survives the friction is real.',
  },
  'Saturn>Ketu': {
    title: 'Saturn transiting natal Ketu',
    severity: 'moderate',
    text: 'Detachment becomes structural. A quiet withdrawal from work or social obligation; strong period for solitary practice and research.',
  },
  'Saturn>Saturn': {
    title: 'Saturn return over natal Saturn',
    severity: 'major',
    text: 'Saturn return. The profession and life structure are assessed against reality. Whatever was built on pretence is dismantled; whatever was earned is confirmed.',
  },
  'Jupiter>Venus': {
    title: 'Jupiter transiting natal Venus',
    severity: 'favourable',
    text: 'Classic marriage and wealth window. Relationship proposals, engagement, expansion of comfort and income. One of the most reliable timing signals for partnership.',
  },
  'Jupiter>Jupiter': {
    title: 'Jupiter return over natal Jupiter',
    severity: 'favourable',
    text: 'Jupiter return - a twelve-year renewal of the self. New direction, new teaching, children, or a widening of the native\'s world.',
  },
  'Jupiter>Saturn': {
    title: 'Jupiter transiting natal Saturn',
    severity: 'favourable',
    text: 'Expansion of the profession. Promotion, larger responsibility, or the point where long labour finally converts into standing.',
  },
  'Jupiter>Moon': {
    title: 'Jupiter transiting natal Moon',
    severity: 'favourable',
    text: 'Mental relief and emotional expansion. Support arrives, the home situation improves, and confidence returns.',
  },
  'Jupiter>Sun': {
    title: 'Jupiter transiting natal Sun',
    severity: 'favourable',
    text: 'Recognition and blessing from authority. Good for position, father-related matters and public standing.',
  },
  'Jupiter>Mars': {
    title: 'Jupiter transiting natal Mars',
    severity: 'favourable',
    text: 'Energy finds direction. Property, technical projects and competitive efforts move forward with unusual ease.',
  },
  'Jupiter>Rahu': {
    title: 'Jupiter transiting natal Rahu',
    severity: 'caution',
    text: 'Guru Chandala by transit. Big opportunities arrive wrapped in exaggeration - expansion is real, the claims around it are not. Verify before committing.',
  },
  'Jupiter>Ketu': {
    title: 'Jupiter transiting natal Ketu',
    severity: 'moderate',
    text: 'Spiritual acceleration and a loss of appetite for ordinary goals. Good for study, pilgrimage and letting a stale commitment go.',
  },
  'Jupiter>Mercury': {
    title: 'Jupiter transiting natal Mercury',
    severity: 'favourable',
    text: 'Business, contracts and learning expand. Strong window for publishing, negotiation and new skills.',
  },
  'Rahu>Jupiter': {
    title: 'Rahu transiting natal Jupiter',
    severity: 'caution',
    text: 'The self inflates. Sudden, large opportunities with unclear foundations; beliefs and advisors get replaced. Excellent for scale, dangerous for judgement.',
  },
  'Rahu>Venus': {
    title: 'Rahu transiting natal Venus',
    severity: 'caution',
    text: 'Desire is magnified. Unconventional attractions, sudden money, and a strong pull towards luxury or foreign connections.',
  },
  'Rahu>Moon': {
    title: 'Rahu transiting natal Moon',
    severity: 'caution',
    text: 'Mental turbulence and vivid imagination. Public visibility rises; so does anxiety. Avoid decisions made at night.',
  },
  'Rahu>Saturn': {
    title: 'Rahu transiting natal Saturn',
    severity: 'moderate',
    text: 'The profession takes an unorthodox turn - foreign work, new technology, or a role that did not exist before.',
  },
  'Ketu>Jupiter': {
    title: 'Ketu transiting natal Jupiter',
    severity: 'moderate',
    text: 'Detachment from the native\'s own identity and ambitions. A quiet phase; forcing progress now rarely works.',
  },
  'Ketu>Venus': {
    title: 'Ketu transiting natal Venus',
    severity: 'caution',
    text: 'Withdrawal inside relationship or a cooling of material desire. Long-standing dissatisfaction surfaces and asks to be addressed.',
  },
  'Ketu>Saturn': {
    title: 'Ketu transiting natal Saturn',
    severity: 'moderate',
    text: 'Interest in the current profession dissolves. Frequently precedes a resignation or a shift into something quieter.',
  },
  'Mars>Saturn': {
    title: 'Mars transiting natal Saturn',
    severity: 'caution',
    text: 'Short, sharp friction at work. Disputes with colleagues, machinery trouble, and a temptation to act rashly against authority.',
  },
  'Mars>Venus': {
    title: 'Mars transiting natal Venus',
    severity: 'moderate',
    text: 'Passion and irritation both rise in relationship matters. Brief, hot, and usually clarifying.',
  },
};

/* -------------------------------------------------------------------------- */
/* 8. Parser                                                                  */
/* -------------------------------------------------------------------------- */

const orderIndex = (p) => PLANET_ORDER.indexOf(p);

/** Normalise an unordered pair to a stable `A|B` key. */
export function pairKey(a, b) {
  return orderIndex(a) <= orderIndex(b) ? `${a}|${b}` : `${b}|${a}`;
}

function slug(...parts) {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
}


/** Tightness of a same-sign conjunction, from the degree gap. */
function conjunctionStrength(gapDeg) {
  if (gapDeg <= 3) return { level: 'exact', label: 'Exact', weight: 3 };
  if (gapDeg <= 8) return { level: 'close', label: 'Close', weight: 2 };
  return { level: 'wide', label: 'Wide', weight: 1 };
}

/** Fallback reading composed from the significator table. */
function generatedPairText(a, b, mode) {
  const A = SIGNIFICATORS[a];
  const B = SIGNIFICATORS[b];
  if (mode === 'opposition') {
    return `${A.primary} sits directly opposite ${B.primary.toLowerCase()}. These two areas of life confront each other and are worked out through the other person or the outside world.`;
  }
  return `${A.primary} blends with ${B.primary.toLowerCase()}. The two significations operate as a single unit in this life.`;
}

function generatedSecondText(base, other) {
  return `${SIGNIFICATORS[other].primary} lies in the future of ${base}'s significations (${SIGNIFICATORS[base].primary.toLowerCase()}).`;
}

function generatedTwelfthText(base, other) {
  return `${SIGNIFICATORS[other].primary} belongs to the past of ${base}'s significations (${SIGNIFICATORS[base].primary.toLowerCase()}).`;
}

/**
 * Scan a chart for every Bhrigu Nadi link and return the matching readings.
 *
 * @param {object} chart  output of computeChart()
 * @param {object} [opts]
 * @param {boolean} [opts.includeGenerated=true]  include significator-composed
 *        readings for pairs with no curated entry
 * @returns {{links:object, readings:Array, summary:object}}
 */
export function analyzeChart(chart, opts = {}) {
  const { includeGenerated = true } = opts;
  const planets = chart.planets;
  const byKey = Object.fromEntries(planets.map((p) => [p.key, p]));

  const links = { conjunctions: [], trines: [], oppositions: [], second: [], twelfth: [], triples: [] };
  const readings = [];

  /* --- Pairwise: conjunction, trine, opposition, 2nd/12th ---------------- */

  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const A = planets[i];
      const B = planets[j];
      // Whole-sign distance from A to B: 1 = same sign, 5 = 5th, 9 = 9th ...
      const dist = houseFrom(A.signIndex, B.signIndex);
      const reverse = houseFrom(B.signIndex, A.signIndex);
      const key = pairKey(A.key, B.key);
      const curated = CONJUNCTION_RULES[key];

      if (dist === 1) {
        const gap = Math.abs(angularSeparation(A.lon, B.lon));
        const strength = conjunctionStrength(gap);
        const link = {
          type: 'conjunction',
          planets: [A.key, B.key],
          sign: A.sign,
          signIndex: A.signIndex,
          gapDeg: gap,
          strength,
        };
        links.conjunctions.push(link);
        if (curated || includeGenerated) {
          readings.push({
            id: slug('conj', A.key, B.key),
            category: 'conjunction',
            categoryLabel: 'Conjunction',
            title: `${A.key} + ${B.key}`,
            subtitle: `Conjunct in ${A.sign} · ${strength.label} (${gap.toFixed(2)}°)`,
            theme: curated?.theme ?? 'Combined Significations',
            polarity: curated?.polarity ?? 'mixed',
            text: curated?.text ?? generatedPairText(A.key, B.key, 'conjunction'),
            tags: curated?.tags ?? [],
            planets: [A.key, B.key],
            weight: 10 + strength.weight,
            generated: !curated,
          });
        }
      } else if (dist === 5 || dist === 9) {
        // 1/5/9 trine - in Bhrigu Nadi this is read as a conjunction.
        const link = {
          type: 'trine',
          planets: [A.key, B.key],
          distance: dist,
          from: A.key,
          to: B.key,
        };
        links.trines.push(link);
        if (curated || includeGenerated) {
          readings.push({
            id: slug('trine', A.key, B.key),
            category: 'trine',
            categoryLabel: 'Trine (1/5/9)',
            title: `${A.key} △ ${B.key}`,
            subtitle: `${B.key} in the ${dist}th from ${A.key} — read as conjunct`,
            theme: curated?.theme ?? 'Combined Significations',
            polarity: curated?.polarity ?? 'mixed',
            text: curated?.text ?? generatedPairText(A.key, B.key, 'conjunction'),
            tags: curated?.tags ?? [],
            planets: [A.key, B.key],
            weight: 8,
            generated: !curated,
          });
        }
      } else if (dist === 7) {
        const curatedOpp = OPPOSITION_RULES[key];
        links.oppositions.push({ type: 'opposition', planets: [A.key, B.key] });
        if (curatedOpp || includeGenerated) {
          readings.push({
            id: slug('opp', A.key, B.key),
            category: 'opposition',
            categoryLabel: '7th Aspect',
            title: `${A.key} ☍ ${B.key}`,
            subtitle: `${A.sign} opposite ${B.sign} — direct mutual aspect`,
            theme: curatedOpp?.theme ?? 'Opposed Significations',
            polarity: curatedOpp?.polarity ?? 'mixed',
            text: curatedOpp?.text ?? generatedPairText(A.key, B.key, 'opposition'),
            tags: curatedOpp?.tags ?? [],
            planets: [A.key, B.key],
            weight: 7,
            generated: !curatedOpp,
          });
        }
      }

      // 2nd / 12th are directional, so check both orientations of the pair.
      for (const [base, other, d] of [
        [A, B, dist],
        [B, A, reverse],
      ]) {
        if (d === 2) {
          const k = `${base.key}>${other.key}`;
          const curatedTxt = SECOND_HOUSE_RULES[k];
          links.second.push({ type: 'second', base: base.key, other: other.key });
          if (curatedTxt || includeGenerated) {
            readings.push({
              id: slug('second', base.key, other.key),
              category: 'second',
              categoryLabel: '2nd — Future',
              title: `${other.key} in the 2nd from ${base.key}`,
              subtitle: `The future of ${base.key}'s significations`,
              theme: 'Future',
              polarity: 'mixed',
              text: curatedTxt ?? generatedSecondText(base.key, other.key),
              tags: ['future'],
              planets: [base.key, other.key],
              weight: 6,
              generated: !curatedTxt,
            });
          }
        } else if (d === 12) {
          const k = `${base.key}>${other.key}`;
          const curatedTxt = TWELFTH_HOUSE_RULES[k];
          links.twelfth.push({ type: 'twelfth', base: base.key, other: other.key });
          if (curatedTxt || includeGenerated) {
            readings.push({
              id: slug('twelfth', base.key, other.key),
              category: 'twelfth',
              categoryLabel: '12th — Past',
              title: `${other.key} in the 12th from ${base.key}`,
              subtitle: `The past behind ${base.key}'s significations`,
              theme: 'Past',
              polarity: 'mixed',
              text: curatedTxt ?? generatedTwelfthText(base.key, other.key),
              tags: ['past'],
              planets: [base.key, other.key],
              weight: 5,
              generated: !curatedTxt,
            });
          }
        }
      }
    }
  }

  /* --- Triple yogas: all three mutually conjunct or trine ---------------- */

  const mutuallyLinked = (p, q) => {
    const d = houseFrom(byKey[p].signIndex, byKey[q].signIndex);
    return d === 1 || d === 5 || d === 9;
  };

  for (const rule of TRIPLE_RULES) {
    const [x, y, z] = rule.planets;
    if (!byKey[x] || !byKey[y] || !byKey[z]) continue;
    if (mutuallyLinked(x, y) && mutuallyLinked(y, z) && mutuallyLinked(x, z)) {
      const allSameSign =
        byKey[x].signIndex === byKey[y].signIndex && byKey[y].signIndex === byKey[z].signIndex;
      links.triples.push({ type: 'triple', planets: rule.planets, sameSign: allSameSign });
      readings.push({
        id: rule.id,
        category: 'triple',
        categoryLabel: 'Three-Planet Yoga',
        title: rule.title,
        subtitle: allSameSign
          ? `All three conjunct in ${byKey[x].sign}`
          : 'Mutually linked by conjunction / trine',
        theme: rule.theme,
        polarity: rule.polarity,
        text: rule.text,
        tags: rule.tags,
        planets: rule.planets,
        weight: allSameSign ? 20 : 15,
        generated: false,
      });
    }
  }

  /* --- Lagna layer -------------------------------------------------------
   * These are the readings that actually move during birth-time rectification:
   * the Ascendant crosses a whole sign roughly every two hours, so house
   * placements and Lagna links flip inside a typical +/-30 minute window.
   */

  const ascBody = chart.ascendant;
  links.lagna = [];

  for (const p of planets) {
    const dist = houseFrom(ascBody.signIndex, p.signIndex);

    if (dist === 1 || dist === 5 || dist === 9) {
      const rule = LAGNA_LINK_RULES[p.key];
      const conjunct = dist === 1;
      const gap = conjunct ? Math.abs(angularSeparation(ascBody.lon, p.lon)) : null;
      links.lagna.push({ type: conjunct ? 'lagna-conjunction' : 'lagna-trine', planet: p.key, distance: dist });
      readings.push({
        id: slug('lagna', conjunct ? 'conj' : 'trine', p.key),
        category: 'lagna',
        categoryLabel: conjunct ? 'Lagna Conjunction' : 'Lagna Trine',
        title: conjunct ? `${p.key} on the Ascendant` : `${p.key} △ Ascendant`,
        subtitle: conjunct
          ? `${p.sign} · ${gap.toFixed(2)}° from the rising degree`
          : `${p.key} in the ${dist}th from Lagna`,
        theme: rule.theme,
        polarity: rule.polarity,
        text: rule.text,
        tags: ['lagna'],
        planets: [p.key, 'Lagna'],
        weight: conjunct ? 18 : 12,
        generated: false,
      });
    }

    // Whole-sign house placement - the standard Vedic layer.
    const h = HOUSE_SIGNIFICATIONS[p.house - 1];
    readings.push({
      id: slug('house', p.key, String(p.house)),
      category: 'house',
      categoryLabel: `House ${p.house}`,
      title: `${p.key} in the ${p.house}${ordinalSuffix(p.house)} house`,
      subtitle: `${h.name} Bhava — ${h.label} · ${p.sign} ${p.dmsLabel}`,
      theme: h.label,
      polarity: 'mixed',
      text: `${SIGNIFICATORS[p.key].primary} operates through the ${p.house}${ordinalSuffix(p.house)} house (${h.text}).${p.dignity ? ` ${p.key} is ${p.dignity.toLowerCase()} here.` : ''}${p.retrograde ? ` Retrograde, so the significations turn inward and repeat.` : ''}`,
      tags: ['house', h.label.toLowerCase()],
      planets: [p.key],
      weight: 4,
      generated: true,
    });
  }

  /* --- Ascendant & Moon Nadi Amsha notes --------------------------------- */

  const asc = chart.ascendant;
  const moon = byKey.Moon;
  readings.push({
    id: 'nadi-amsha-lagna',
    category: 'nadiAmsha',
    categoryLabel: 'Nadi Amsha',
    title: `Lagna Nadi Amsha ${asc.nadiAmsha.index} / 150`,
    subtitle: `${asc.sign} ${asc.nadiAmsha.arcLabel} · D-150 sign ${asc.nadiAmsha.d150Sign}`,
    theme: 'Micro-degree',
    polarity: 'mixed',
    text: `The Ascendant occupies Nadi Amsha ${asc.nadiAmsha.index} of ${asc.sign} (part ${asc.nadiAmsha.indexInZodiac} of 1800 across the zodiac), whose D-150 sign is ${asc.nadiAmsha.d150Sign}, ruled by ${SIGNS[asc.nadiAmsha.d150SignIndex].lord}. It flips to the next amsha after a further ${asc.nadiAmsha.remainingArcMinutes.toFixed(2)} arcminutes of rising — roughly ${(asc.nadiAmsha.remainingArcMinutes * 4).toFixed(0)} seconds of clock time.`,
    tags: ['nadi amsha', 'lagna'],
    planets: ['Lagna'],
    weight: 30,
    generated: false,
  });
  if (moon) {
    readings.push({
      id: 'nadi-amsha-moon',
      category: 'nadiAmsha',
      categoryLabel: 'Nadi Amsha',
      title: `Moon Nadi Amsha ${moon.nadiAmsha.index} / 150`,
      subtitle: `${moon.sign} ${moon.nadiAmsha.arcLabel} · D-150 sign ${moon.nadiAmsha.d150Sign}`,
      theme: 'Micro-degree',
      polarity: 'mixed',
      text: `The Moon occupies Nadi Amsha ${moon.nadiAmsha.index} of ${moon.sign} (part ${moon.nadiAmsha.indexInZodiac} of 1800), D-150 sign ${moon.nadiAmsha.d150Sign} ruled by ${SIGNS[moon.nadiAmsha.d150SignIndex].lord}. Nakshatra ${moon.nakshatra.name} pada ${moon.nakshatra.pada}, lord ${moon.nakshatra.lord}.`,
      tags: ['nadi amsha', 'moon'],
      planets: ['Moon'],
      weight: 29,
      generated: false,
    });
  }

  readings.sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title));

  const summary = {
    conjunctionCount: links.conjunctions.length,
    lagnaLinkCount: links.lagna.length,
    trineCount: links.trines.length,
    oppositionCount: links.oppositions.length,
    secondCount: links.second.length,
    twelfthCount: links.twelfth.length,
    tripleCount: links.triples.length,
    curatedCount: readings.filter((r) => !r.generated).length,
    generatedCount: readings.filter((r) => r.generated).length,
  };

  return { links, readings, summary };
}

/**
 * Bhrigu Nadi transit analysis: which transiting planet is sitting on, or in
 * trine to, which natal planet right now.
 *
 * @param {object} natal    computeChart() output for the birth moment
 * @param {object} transit  computeChart() output for the transit moment
 */
export function analyzeTransits(natal, transit) {
  const hits = [];

  for (const t of transit.planets) {
    for (const n of natal.planets) {
      const dist = houseFrom(n.signIndex, t.signIndex);
      const isConjunct = dist === 1;
      const isTrine = dist === 5 || dist === 9;
      if (!isConjunct && !isTrine) continue;

      const key = `${t.key}>${n.key}`;
      const rule = TRANSIT_RULES[key];
      const gap = Math.abs(angularSeparation(t.lon, n.lon));
      // Only conjunctions get a degree orb; trines are whole-sign by nature.
      const exact = isConjunct && gap <= 3;

      if (!rule && !isConjunct) continue; // keep trine noise down unless curated

      hits.push({
        id: slug('transit', t.key, n.key, isConjunct ? 'conj' : 'trine'),
        transitPlanet: t.key,
        natalPlanet: n.key,
        relation: isConjunct ? 'conjunction' : 'trine',
        sign: t.sign,
        natalSign: n.sign,
        gapDeg: isConjunct ? gap : null,
        exact,
        transitRetrograde: t.retrograde,
        title: rule?.title ?? `${t.key} transiting natal ${n.key}`,
        severity: rule?.severity ?? 'moderate',
        text:
          rule?.text ??
          `Transiting ${t.key} (${SIGNIFICATORS[t.key].primary.toLowerCase()}) activates natal ${n.key} (${SIGNIFICATORS[n.key].primary.toLowerCase()}) by ${isConjunct ? 'conjunction' : `${dist}th-house trine`} in ${t.sign}.`,
        curated: Boolean(rule),
        weight:
          (rule ? 10 : 0) +
          (isConjunct ? 6 : 2) +
          (exact ? 4 : 0) +
          (['Saturn', 'Jupiter', 'Rahu', 'Ketu'].includes(t.key) ? 5 : 0),
      });
    }
  }

  hits.sort((a, b) => b.weight - a.weight);

  // Double transit: Jupiter and Saturn both activating the same natal planet.
  const byNatal = {};
  for (const h of hits) {
    if (h.transitPlanet === 'Jupiter' || h.transitPlanet === 'Saturn') {
      byNatal[h.natalPlanet] = byNatal[h.natalPlanet] || new Set();
      byNatal[h.natalPlanet].add(h.transitPlanet);
    }
  }
  const doubleTransits = Object.entries(byNatal)
    .filter(([, set]) => set.size === 2)
    .map(([natalPlanet]) => ({
      id: slug('double-transit', natalPlanet),
      natalPlanet,
      title: `Double transit on natal ${natalPlanet}`,
      severity: 'major',
      text: `Both Jupiter and Saturn are activating natal ${natalPlanet} at the same time. In Bhrigu Nadi this is the strongest event-timing signal available: matters ruled by ${SIGNIFICATORS[natalPlanet]?.primary.toLowerCase() ?? natalPlanet} are simultaneously expanded and made permanent.`,
    }));

  return { hits, doubleTransits, transitMoment: transit.meta.timing };
}

/** Flat manifest of every reading id the engine can emit, for UI lookups. */
export function rulesManifest() {
  return {
    significators: SIGNIFICATORS,
    conjunctionPairs: Object.keys(CONJUNCTION_RULES).length,
    oppositionPairs: Object.keys(OPPOSITION_RULES).length,
    secondRules: Object.keys(SECOND_HOUSE_RULES).length,
    twelfthRules: Object.keys(TWELFTH_HOUSE_RULES).length,
    tripleYogas: TRIPLE_RULES.length,
    transitRules: Object.keys(TRANSIT_RULES).length,
  };
}
