/**
 * 识别接口返回的"subcategoryHint"到现有细分领域 id 的简单映射
 * 命中规则：优先完全相等，其次包含关系
 */
export const SUBCATEGORY_HINT_MAP: Record<string, string> = {
  工作: 'growth-deepwork',
  学习: 'growth-input',
  健康: 'health-sleep',
  生活: 'survival-food',
  运动: 'health-exercise',
  娱乐: 'leisure-passive',
  阅读: 'growth-input',
  写作: 'growth-output',
  休息: 'health-repair',
  睡眠: 'health-sleep',
};
