import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { db, newRecordId } from '../db';
import { useAppStore } from '../store';
import { addRecord, recomputeDuration } from '../utils/records';
import { formatClock, formatDurationMin } from '../utils/time';
import type { Subcategory, ValueScore } from '../types';
import BottomSheet from './BottomSheet';
import CategoryPicker from './CategoryPicker';
import TimeRangeModal from './TimeRangeModal';

export default function ArchiveSheet() {
  const draft = useAppStore((s) => s.archiveDraft);
  const setDraft = useAppStore((s) => s.setArchiveDraft);
  const showToast = useAppStore((s) => s.showToast);

  const [step, setStep] = useState<1 | 2>(1);
  const [startAt, setStartAt] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [frameworkId, setFrameworkId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [eventName, setEventName] = useState('');
  const [note, setNote] = useState('');
  const [valueScore, setValueScore] = useState<ValueScore | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customFrameworkId, setCustomFrameworkId] = useState('');

  const frameworks = useLiveQuery(() => db.frameworks.orderBy('order').toArray(), []);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('order').toArray(), []);

  useEffect(() => {
    if (draft) {
      const firstFwId = draft.presetFrameworkId ?? frameworks?.[0]?.id ?? '';
      const firstSub = subcategories?.find((s) => s.frameworkId === firstFwId)?.id ?? '';
      setStep(1);
      setStartAt(draft.startAt);
      setEndAt(draft.endAt);
      setFrameworkId(firstFwId);
      setSubcategoryId(draft.presetSubcategoryId ?? firstSub);
      setNote(draft.presetNote ?? '');
      setValueScore(draft.presetValueScore ?? null);
      setEventName(draft.presetEventName ?? '');
      setShowAddCustom(false);
      setCustomFrameworkId(firstFwId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const duration = recomputeDuration(startAt, endAt);

  const goNext = () => {
    if (!frameworkId && frameworks?.length) {
      setFrameworkId(frameworks[0].id);
      const firstSub = subcategories?.find((s) => s.frameworkId === frameworks[0].id);
      if (firstSub) setSubcategoryId(firstSub.id);
    }
    setStep(2);
  };

  const addCustomSubcategory = async () => {
    const name = customName.trim();
    if (!name) {
      showToast('请输入事件名称');
      return;
    }
    const fwId = customFrameworkId || frameworkId || frameworks?.[0]?.id;
    if (!fwId) {
      showToast('请先选择所属框架');
      return;
    }
    // 已存在则直接选中
    const existed = subcategories?.find((s) => s.name === name && s.frameworkId === fwId);
    if (existed) {
      setSubcategoryId(existed.id);
      setFrameworkId(fwId);
    } else {
      const id = 'custom-' + newRecordId();
      const order = (subcategories ?? []).filter((s) => s.frameworkId === fwId).length;
      const sub: Subcategory = { id, frameworkId: fwId, name, order };
      await db.subcategories.add(sub);
      setSubcategoryId(id);
      setFrameworkId(fwId);
      showToast(`已新建事件「${name}」并选中`);
    }
    setShowAddCustom(false);
    setCustomName('');
  };

  const save = async () => {
    await addRecord({
      startAt,
      endAt,
      durationMin: recomputeDuration(startAt, endAt),
      frameworkId,
      subcategoryId,
      eventName: eventName.trim() || undefined,
      note,
      valueScore,
      source: draft?.source ?? 'manual',
    });
    showToast('已归档');
    setDraft(null);
  };

  return (
    <>
      <BottomSheet open={!!draft} onClose={() => setDraft(null)} title={step === 1 ? '本次记录' : '归档到'}>
        {step === 1 ? (
          <div className="space-y-5 pb-2">
            <div className="text-center">
              <p className="text-4xl font-semibold text-binance">{formatDurationMin(duration)}</p>
              <p className="mt-2 text-sm text-text-secondary">
                {formatClock(startAt)} - {formatClock(endAt)}
              </p>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="w-full rounded-xl border border-line py-2.5 text-sm text-text-secondary"
            >
              修改时间
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setDraft(null)}
                className="flex-1 rounded-xl border border-line py-3 text-sm text-text-secondary"
              >
                丢弃
              </button>
              <button onClick={goNext} className="flex-1 rounded-xl bg-binance py-3 text-sm font-semibold text-black">
                下一步
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-2">
            <button
              onClick={() => setEditOpen(true)}
              className="w-full rounded-xl border border-line py-2.5 text-center text-sm text-text-secondary"
            >
              {formatClock(startAt)} - {formatClock(endAt)} · {formatDurationMin(duration)}
            </button>

            {/* 事件名称（#7） */}
            <div>
              <p className="mb-1.5 text-xs text-text-secondary">事件名称</p>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="例如：完成迹时 2.0 计划表"
                className="w-full rounded-xl border border-line bg-bg-card2 px-3 py-2.5 text-sm text-text outline-none focus:border-binance"
              />
            </div>

            <CategoryPicker
              frameworkId={frameworkId}
              subcategoryId={subcategoryId}
              note={note}
              valueScore={valueScore}
              onChange={(p) => {
                if (p.frameworkId !== undefined) setFrameworkId(p.frameworkId);
                if (p.subcategoryId !== undefined) setSubcategoryId(p.subcategoryId);
                if (p.note !== undefined) setNote(p.note);
                if (p.valueScore !== undefined) setValueScore(p.valueScore);
              }}
            />

            {/* 自定义事件（#8） */}
            <div>
              {!showAddCustom ? (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-binance/40 py-2 text-xs text-binance"
                >
                  <Plus size={13} /> 添加自定义事件
                </button>
              ) : (
                <div className="rounded-xl border border-binance/30 bg-binance/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-binance">新建事件</p>
                    <button onClick={() => setShowAddCustom(false)} className="text-text-secondary">
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="事件名称"
                    className="mt-2 w-full rounded-lg border border-line bg-bg-card2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-binance"
                  />
                  <select
                    value={customFrameworkId || frameworkId}
                    onChange={(e) => setCustomFrameworkId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-line bg-bg-card2 px-2.5 py-1.5 text-sm text-text"
                  >
                    {frameworks?.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void addCustomSubcategory()}
                    className="mt-2 w-full rounded-lg bg-binance py-1.5 text-xs font-semibold text-black"
                  >
                    保存并选中
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDraft(null)}
                className="flex-1 rounded-xl border border-line py-3 text-sm text-text-secondary"
              >
                丢弃
              </button>
              <button onClick={save} className="flex-1 rounded-xl bg-binance py-3 text-sm font-semibold text-black">
                保存
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
      <TimeRangeModal
        open={editOpen}
        startAt={startAt}
        endAt={endAt}
        onClose={() => setEditOpen(false)}
        onSave={(s, e) => {
          setStartAt(s);
          setEndAt(e);
          setEditOpen(false);
        }}
      />
    </>
  );
}
