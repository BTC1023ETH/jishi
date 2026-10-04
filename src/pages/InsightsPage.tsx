import { Sparkles } from 'lucide-react';
import { SLOGAN } from '../constants';

export default function InsightsPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-8 pb-32 pt-40 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-bg-card">
        <Sparkles size={28} className="text-binance" />
      </div>
      <h2 className="mt-6 text-lg font-semibold text-text">敬请期待</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        洞察与 AI 周报将在第二版上线。
        <br />
        届时，迹时会把你的时间记录，变成有温度的看见。
      </p>
      <p className="mt-10 text-xs text-text-secondary">{SLOGAN}</p>
    </div>
  );
}
