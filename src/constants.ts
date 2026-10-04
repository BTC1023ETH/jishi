import type { Framework, Settings, Subcategory } from './types';

export const SLOGAN = '让时间流向，更有价值的地方。';

export const DEFAULT_FRAMEWORKS: Framework[] = [
  { id: 'survival', name: '生存与日常', color: '#F0A020', order: 0 },
  { id: 'growth', name: '成长与产出', color: '#F0B90B', order: 1 },
  { id: 'leisure', name: '休闲与社交', color: '#2EBD85', order: 2 },
  { id: 'health', name: '身体与心理', color: '#4A9EFF', order: 3 },
];

export const DEFAULT_SUBCATEGORIES: Subcategory[] = [
  { id: 'survival-food', frameworkId: 'survival', name: '餐饮', order: 0 },
  { id: 'survival-living', frameworkId: 'survival', name: '起居', order: 1 },
  { id: 'survival-commute', frameworkId: 'survival', name: '通勤', order: 2 },

  { id: 'growth-deepwork', frameworkId: 'growth', name: '深度工作', order: 0 },
  { id: 'growth-input', frameworkId: 'growth', name: '信息输入', order: 1 },
  { id: 'growth-output', frameworkId: 'growth', name: '信息输出', order: 2 },

  { id: 'leisure-passive', frameworkId: 'leisure', name: '被动消遣', order: 0 },
  { id: 'leisure-hobby', frameworkId: 'leisure', name: '主动爱好', order: 1 },
  { id: 'leisure-social', frameworkId: 'leisure', name: '社交与连接', order: 2 },

  { id: 'health-sleep', frameworkId: 'health', name: '睡眠', order: 0 },
  { id: 'health-exercise', frameworkId: 'health', name: '运动', order: 1 },
  { id: 'health-repair', frameworkId: 'health', name: '身心修复', order: 2 },
];

export const DEFAULT_SETTINGS: Settings = {
  sleepStart: '23:00',
  sleepEnd: '07:00',
  timeoutInterval: '1h',
  forgotStopReminder: true,
};

export const VALUE_SCORES = [
  { id: 'nourish', name: '滋养', color: '#2EBD85' },
  { id: 'neutral', name: '中性', color: '#848E9C' },
  { id: 'drain', name: '消耗', color: '#F6465D' },
] as const;

export const SLEEP_FRAMEWORK_ID = 'health';
export const SLEEP_SUBCATEGORY_ID = 'health-sleep';
