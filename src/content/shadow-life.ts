import type { ShadowPassage } from '../types.ts'

export const lifeShadow: ShadowPassage[] = [
  {
    id: 'S13',
    title: '跟读：便利店柜台',
    titleJa: 'レジの言い方',
    domain: 'daily',
    registerZh: '店员口语',
    minutes: '约 4 分钟',
    summaryZh: '便利店柜台上一小段话。约 4 分钟。',
    coachZh: '价钱和「こちらで」要分开。答应的事和不能代劳的事，句尾不要读成同一种肯定。',
    chunks: [
      { spoken: '温めは、こちらでやります。', written: '加熱は、当店で行います。', noticeZh: '「こちらで」是责任所在，轻轻加重。' },
      { spoken: '袋は有料です。一枚五円です。', written: '袋は有料で、一枚五円です。', noticeZh: '两句都落下。不要把五円读成疑问。' },
      { spoken: '宛名は、こちらでは書きません。', written: '宛名は、当店では記入しません。', noticeZh: '否定在句尾。前面先把对象说完。' },
      { spoken: 'ポイントは、カードがないと付けられません。', written: 'ポイントは、カードがなければ付与できません。', noticeZh: '条件在前，不能办的结果在后。' },
    ],
  },
  {
    id: 'S14',
    title: '跟读：车站窗口',
    titleJa: '駅の窓口',
    domain: 'daily',
    registerZh: '站务说明',
    minutes: '约 4 分钟',
    summaryZh: '车站窗口的一小段说明。约 4 分钟。',
    coachZh: '「出ずに」是条件。免费和另付，不要读成同一句。',
    chunks: [
      { spoken: '改札は、出ないでください。', written: '改札は、出ないでください。', noticeZh: '请求短、清楚，句尾落下。' },
      { spoken: '反対側の電車で、一つ戻ってください。', written: '反対方面の電車で、一駅戻ってください。', noticeZh: '方向和站数分成两截。' },
      { spoken: '遅れだけでは、運賃は無料になりません。', written: '遅延だけでは、運賃は無料になりません。', noticeZh: '「だけでは」后面留一点气，否定再落下。' },
      { spoken: '一度出ると、入り直す運賃が別です。', written: '一度出ると、再度入場する運賃が別になります。', noticeZh: '结果放在后半句。' },
    ],
  },
  {
    id: 'S15',
    title: '跟读：市政府窗口',
    titleJa: '役所の窓口',
    domain: 'daily',
    registerZh: '窗口说明',
    minutes: '约 4 分钟',
    summaryZh: '市政府窗口的一小段说明。约 4 分钟。',
    coachZh: '两件事分开说。能办的一句落下，不能办的一句也落下，不要连成一个「都行」。',
    chunks: [
      { spoken: '住民票は、今日出せます。', written: '住民票の写しは、本日発行できます。', noticeZh: '能办的事说短，不要加多余的歉意。' },
      { spoken: '免許証があれば、本人確認は足ります。', written: '免許証があれば、本人確認は足ります。', noticeZh: '条件在前，结论在后。' },
      { spoken: '印鑑登録は、印鑑がないと受けられません。', written: '印鑑登録は、印鑑がなければ受理できません。', noticeZh: '缺的东西先说，不能受理放在句尾。' },
      { spoken: '印鑑は、別の日にお持ちください。', written: '印鑑は、別日にご持参ください。', noticeZh: '下一步单独成句，语调平稳。' },
    ],
  },
]
