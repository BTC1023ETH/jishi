import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db';
import { useAppStore } from '../store';
import { deleteRecord, recomputeDuration, updateRecord } from '../utils/records';
import { formatClock, formatDurationMin } from '../utils/time';
import type { ValueScore } from '../types';
import BottomSheet from './BottomSheet';
import CategoryPicker from './CategoryPicker';
import TimeRangeModal from './TimeRangeModal';

export default function RecordDetailModal() {
  const editRecordId = useAppStore((s) => s.editRecordId);
  const setEditRecordId = useAppStore((s) => s.setEditRecordId);
  const showToast = useAppStore((s) => s.showToast);

  const record = useLiveQuery(() => (editRecordId ? db.records.get(editRecordId) : undefined), [editRecordId]);

  const [startAt, setStartAt] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [frameworkId, setFrameworkId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [eventName, setEventName] = useState('');
  const [note, setNote] = useState('');
  const [valueScore, setValueScore] = useState<ValueScore | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (record) {
      setStartAt(record.startAt);
      setEndAt(record.endAt);
      setFrameworkId(record.frameworkId);
      setSubcategoryId(record.subcategoryId);
      setEventName(record.eventName ?? '');
      setNote(record.note ?? '');
      setValueScore(record.valueScore ?? null);
    }
  }, [record]);

  const save = async () => {
    if (!record?.id) return;
    await updateRecord(record.id, {
      startAt,
      endAt,
      durationMin: recomputeDuration(startAt, endAt),
      frameworkId,
      subcategoryId,
      eventName: eventName.trim() || undefined,
      note,
      valueScore,
    });
    showToast('已保存');
    setEditRecordId(null);
  };

  const del = async () => {
    if (!record?.id) return;
    await deleteRecord(record.id);
    showToast('已删除');
    setEditRecordId(null);
  };

  return (
    <>
      <BottomSheet open={!!editRecordId} onClose={() => setEditRecordId(null)} title="记录详情">
        <div className="space-y-5 pb-2">
          <button
            onClick={() => setEditOpen(true)}
            className="w-full rounded-xl border border-line py-2.5 text-center text-sm text-text-secondary"
          >
            {formatClock(startAt)} - {formatClock(endAt)} · {formatDurationMin(recomputeDuration(startAt, endAt))}
          </button>
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
          <div className="flex gap-3">
            <button onClick={del} className="flex-1 rounded-xl border border-drain/40 py-3 text-sm text-drain">
              删除
            </button>
            <button onClick={save} className="flex-[2] rounded-xl bg-binance py-3 text-sm font-semibold text-black">
              保存
            </button>
          </div>
        </div>
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
