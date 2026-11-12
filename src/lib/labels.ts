import type { Domain, Mode, QuestionType } from '../types.ts'

export const domainLabel: Record<Domain, string> = {
  news: '新闻与评论',
  workplace: '职场与敬语',
  academic: '学术短讲',
  interview: '访谈',
  negotiation: '投诉与交涉',
  register: '语体切换',
  implication: '言外之意',
  prosody: '句调',
}

export const questionTypeLabel: Record<QuestionType, string> = {
  gist: '要旨',
  detail: '细节',
  attitude: '态度',
  implication: '言外之意',
}

export const modeLabel: Record<Mode, string> = {
  listen: '听解',
  shadow: '跟读',
  role: '应对',
  read: '朗读',
}

export const modePath: Record<Mode, string> = {
  listen: '/listen',
  shadow: '/speak/shadow',
  role: '/speak/role',
  read: '/speak/read',
}
