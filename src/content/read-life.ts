import type { ReadSet } from '../types.ts'

export const lifeRead: ReadSet[] = [
  {
    id: 'P09',
    title: '朗读：窗口上的短句',
    titleJa: '窓口の短文',
    domain: 'daily',
    minutes: '约 4 分钟',
    summaryZh: '四句在窗口会用到的话。约 4 分钟。',
    focusZh: '能办和不能办分成两句。否定落在句尾，不要提前把声音降成抱歉。',
    sentences: [
      { text: '住民票の写しは、本日発行できます。', noteZh: '能办的事说稳，句尾落下。' },
      { text: '印鑑登録は、印鑑がなければ受理できません。', noteZh: '缺的条件先说完，不能受理再落下。' },
      { text: '口座の開設は今日です。', noteZh: '短句。不要连到下一句里。' },
      { text: 'カードは、後日お送りします。', noteZh: '时间和动作分开。这句不是道歉。' },
    ],
  },
  {
    id: 'P10',
    title: '朗读：预约时的短句',
    titleJa: '予約の短文',
    domain: 'daily',
    minutes: '约 4 分钟',
    summaryZh: '四句订位或看病时的话。约 4 分钟。',
    focusZh: '已经定下的事读得落下。还要确认的事，句尾不要读成已经答应。',
    sentences: [
      { text: '七時に、四人の席をお取りします。', noteZh: '人数和时间都是承诺的内容，说清楚再落下。' },
      { text: '窓側は、お約束できません。', noteZh: '否定在最后。前面不要先摇头。' },
      { text: '初めての受診です。', noteZh: '事实短句，单独落下。' },
      { text: '予約はありませんが、今日診ていただけますか。', noteZh: '让步在前，请求在「か」。不要把前半读成已经看完。' },
    ],
  },
]
