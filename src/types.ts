export type Domain =
  | 'politics'
  | 'economy'
  | 'society'
  | 'tech'
  | 'entertainment'
  | 'culture'
  | 'food'
  | 'sports'
  | 'workplace'
  | 'academic'
  | 'interview'
  | 'negotiation'
  | 'register'
  | 'implication'
  | 'prosody'

export type QuestionType = 'gist' | 'detail' | 'attitude' | 'implication' | 'intent' | 'inference' | 'vocab'

export type SpeakerLine = {
  speaker?: string
  roleZh?: string
  text: string
}

export type Vocab = {
  word: string
  reading: string
  meaningZh: string
}

export type Choice = {
  id: string
  text: string
  textZh: string
}

export type ListenQuestion = {
  id: string
  type: QuestionType
  prompt: string
  promptZh: string
  options: Choice[]
  answer: string
  explanationZh: string
}

export type ListeningItem = {
  id: string
  title: string
  titleJa?: string
  domain: Domain
  kind: 'monologue' | 'dialogue'
  minutes: string
  summaryZh?: string
  focusZh: string
  situationZh: string
  sourceZh?: string
  newsDate?: string
  lines: SpeakerLine[]
  questions: ListenQuestion[]
  vocab: Vocab[]
}

export type ShadowChunk = {
  spoken: string
  written: string
  noticeZh: string
}

export type ShadowPassage = {
  id: string
  title: string
  titleJa?: string
  domain: Domain
  registerZh: string
  minutes: string
  summaryZh?: string
  coachZh: string
  sourceZh?: string
  newsDate?: string
  chunks: ShadowChunk[]
}

export type RolePoint = {
  labelZh: string
  keywords: string[]
}

export type RoleVariant = {
  labelZh: string
  text: string
}

export type RoleScenario = {
  id: string
  title: string
  titleJa?: string
  domain: Domain
  register: 'formal' | 'casual'
  registerZh: string
  minutes: string
  summaryZh?: string
  situationZh: string
  yourRoleZh: string
  counterpartRoleZh: string
  counterpart: string
  goalsZh: string[]
  points: RolePoint[]
  model: string
  variants: RoleVariant[]
  coachZh: string
  sourceZh?: string
  newsDate?: string
  relatedId?: string
  relatedLabel?: string
}

export type ReadSentence = {
  text: string
  noteZh: string
}

export type ReadSet = {
  id: string
  title: string
  titleJa?: string
  domain: Domain
  focusZh: string
  minutes: string
  summaryZh?: string
  sourceZh?: string
  newsDate?: string
  sentences: ReadSentence[]
}

export type ArticleLevel = 'n1' | 'n1plus'

export type Article = {
  id: string
  title: string
  titleJa?: string
  topic: Domain
  level: ArticleLevel
  minutes: string
  leadZh: string
  sourceZh?: string
  newsDate?: string
  paragraphs: string[]
  questions: ListenQuestion[]
}

export type DictTopic = 'politics' | 'economy' | 'society' | 'tech' | 'culture' | 'life' | 'thought' | 'action'

export type DictEntry = {
  id: string
  word: string
  reading: string
  pos: string
  topic: DictTopic
  meaningZh: string
  example: string
  exampleZh: string
  forms?: string[]
}

export type Mode = 'listen' | 'shadow' | 'role' | 'read' | 'article'

export type Settings = {
  rate: number
  furigana: boolean
  hints: boolean
  theme: 'light' | 'dark'
}

export type ItemRecord = {
  best: number
  last: number
  attempts: number
  updatedAt: number
}

export type Activity = {
  at: number
  mode: Mode
  id: string
  score: number
  title: string
}

export type Persisted = {
  settings: Settings
  records: Record<string, ItemRecord>
  streak: { count: number; lastDay: string }
  activity: Activity[]
  savedWords: string[]
}
