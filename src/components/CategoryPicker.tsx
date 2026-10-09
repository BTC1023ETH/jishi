import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { VALUE_SCORES } from '../constants';
import type { ValueScore } from '../types';

export interface CategoryPatch {
  frameworkId?: string;
  subcategoryId?: string;
  note?: string;
  valueScore?: ValueScore | null;
}

interface Props {
  frameworkId: string;
  subcategoryId: string;
  note: string;
  valueScore: ValueScore | null;
  onChange: (p: CategoryPatch) => void;
}

export default function CategoryPicker({
  frameworkId,
  subcategoryId,
  note,
  valueScore,
  onChange,
}: Props) {
  const frameworks = useLiveQuery(() => db.frameworks.orderBy('order').toArray(), []);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('order').toArray(), []);

  const fwList = (frameworks ?? []).map((f) => ({
    ...f,
    subs: (subcategories ?? [])
      .filter((s) => s.frameworkId === f.id)
      .sort((a, b) => a.order - b.order),
  }));
  const currentFw = fwList.find((f) => f.id === frameworkId) ?? fwList[0];

  const selectFw = (id: string) => {
    const fw = fwList.find((f) => f.id === id);
    onChange({ frameworkId: id, subcategoryId: fw?.subs[0]?.id ?? '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-text-secondary">大框架</p>
        <div className="grid grid-cols-2 gap-2">
          {fwList.map((f) => {
            const active = f.id === currentFw?.id;
            return (
              <button
                key={f.id}
                onClick={() => selectFw(f.id)}
                className={`flex items-center rounded-xl border px-3 py-2.5 text-sm transition ${
                  active ? 'text-white' : 'border-line text-text-secondary'
                }`}
                style={active ? { borderColor: f.color, backgroundColor: f.color + '1A' } : undefined}
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                {f.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-text-secondary">细分领域</p>
        <div className="flex flex-wrap gap-2">
          {currentFw?.subs.map((s) => {
            const active = s.id === subcategoryId;
            return (
              <button
                key={s.id}
                onClick={() => onChange({ subcategoryId: s.id })}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  active ? 'border-binance text-binance' : 'border-line text-text-secondary'
                }`}
              >
                {s.name}
              </button>
            );
          })}
          {!currentFw?.subs.length && (
            <span className="text-sm text-text-secondary">该框架暂无细分领域</span>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-text-secondary">价值评分（可选）</p>
        <div className="flex gap-2">
          {VALUE_SCORES.map((v) => {
            const active = valueScore === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onChange({ valueScore: active ? null : v.id })}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  active ? 'text-white' : 'border-line text-text-secondary'
                }`}
                style={active ? { borderColor: v.color, backgroundColor: v.color + '1A' } : undefined}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-text-secondary">心得与感受</p>
        <textarea
          value={note}
          onChange={(e) => onChange({ note: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-line bg-bg-card2 px-3 py-2 text-sm text-white outline-none placeholder:text-text-secondary focus:border-binance"
          placeholder="记下你的感受、收获、复盘…（可选）"
        />
      </div>
    </div>
  );
}
