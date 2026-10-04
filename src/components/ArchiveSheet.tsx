import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db';
import { useAppStore } from '../store';
import { addRecord, recomputeDuration } from '../utils/records';
import { formatClock, formatDurationMin } from '../utils/time';
import type { ValueScore } from '../types';
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
  const [note, setNote] = useState('');
  const [valueScore, setValueScore] = useState<ValueScore | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  const save = async () => {
    await addRecord({
      startAt,
      endAt,
      durationMin: recomputeDuration(startAt, endAt),
      frameworkId,
      subcategoryId,
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
