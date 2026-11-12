import type { ArticleLevel, DictTopic, Domain, Mode, QuestionType } from '../types.ts'

export const domainOrder: Domain[] = [
  'politics',
  'economy',
  'society',
  'tech',
  'entertainment',
  'culture',
  'food',
  'sports',
  'workplace',
  'academic',
  'interview',
  'negotiation',
  'register',
  'implication',
  'prosody',
]

export const domainLabel: Record<Domain, string> = {
  politics: '时政',
  economy: '经济',
  society: '社会',
  tech: '科技',
  entertainment: '娱乐',
  culture: '文化',
  food: '美食',
  sports: '体育',
  workplace: '职场',
  academic: '学术',
  interview: '访谈',
  negotiation: '交涉',
  register: '语体',
  implication: '言外之意',
  prosody: '句调',
}

export const questionTypeLabel: Record<QuestionType, string> = {
  gist: '大意',
  detail: '细节',
  attitude: '说话人态度',
  implication: '言外之意',
  intent: '作者意图',
  inference: '推断',
  vocab: '词在文中',
}

export const questionListenFor: Record<QuestionType, string> = {
  gist: '要抓住整段最后留下的判断，不要被开头那个显眼的事实带走。',
  detail: '只认稿子里说过的具体事实。没听到的，不要用常识补上。',
  attitude: '听说话人自己的态度。他转述的数字、别人的话，不算态度。',
  implication: '听没有直说、但话已经推到的那一层。',
  intent: '看作者把责任或判断放在谁身上，而不是复述表面事件。',
  inference: '文中没有写明，但根据已经给出的信息推得出来。',
  vocab: '看这个词在这一篇里的意思，不是它在别的文章里的另一个义项。',
}

export const levelLabel: Record<ArticleLevel, string> = {
  n1: 'N1',
  n1plus: 'N1 以后',
}

export const dictTopicOrder: DictTopic[] = ['politics', 'economy', 'society', 'tech', 'culture', 'life', 'thought', 'action']

export const dictTopicLabel: Record<DictTopic, string> = {
  politics: '时政制度',
  economy: '经济商务',
  society: '社会公共',
  tech: '科技信息',
  culture: '文化艺术',
  life: '生活饮食',
  thought: '判断态度',
  action: '动作变化',
}

export const modeLabel: Record<Mode, string> = {
  listen: '听解',
  shadow: '跟读',
  role: '应对',
  read: '朗读',
  article: '阅读',
}

export const modePath: Record<Mode, string> = {
  listen: '/listen',
  shadow: '/speak/shadow',
  role: '/speak/role',
  read: '/speak/read',
  article: '/reading',
}
