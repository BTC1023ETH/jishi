import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, FileUp, Plus, Trash2, X } from 'lucide-react';
import { db, newPlanId } from '../db';
import { useAppStore } from '../store';
import type { PlanItem } from '../types';
import { dayStart } from '../utils/time';
import { recognizePlan, type RecognizedItem } from '../utils/api';
import { SUBCATEGORY_HINT_MAP } from '../utils/categoryHints';

interface Props {
  /** 当前浏览的日期（00:00 时间戳） */
  date: number;
  /** 用于显示的细分领域列表（用于让用户把计划项关联到已有细分） */
  subcategories: { id: string; name: string; frameworkId: string }[];
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function defaultTimes(): { start: string; end: string } {
  const now = new Date();
  const startH = now.getHours();
  const startM = now.getMinutes() < 30 ? 0 : 30;
  const start = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
  const endMin = startM + 30;
  const endH = endMin >= 60 ? startH + 1 : startH;
  const eM = endMin % 60;
  const end = `${String(((endH + 24) % 24)).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
  return { start, end };
}

export default function TodayPlanPanel({ date, subcategories }: Props) {
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [previewItems, setPreviewItems] = useState<RecognizedItem[] | null>(null);
  const [draft, setDraft] = useState<{ start: string; end: string; title: string; subcategoryId: string }>({
    start: defaultTimes().start,
    end: defaultTimes().end,
    title: '',
    subcategoryId: '',
  });
  const fileRef = useFileRef();

  const dayStartTs = dayStart(date);
  const plans = useLiveQuery(
    () => db.plans.where('date').equals(dayStartTs).sortBy('startTime'),
    [dayStartTs],
  ) ?? [];

  const doneCount = plans.filter((p) => p.done).length;

  const addPlan = async () => {
    if (!draft.title.trim()) {
      showToast('请输入任务名称');
      return;
    }
    const now = Date.now();
    const item: PlanItem = {
      id: newPlanId(),
      date: dayStartTs,
      startTime: draft.start,
      endTime: draft.end,
      title: draft.title.trim(),
      subcategoryId: draft.subcategoryId || undefined,
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.plans.add(item);
    setDraft({ ...draft, title: '', subcategoryId: '' });
    setAdding(false);
  };

  const toggleDone = async (p: PlanItem) => {
    if (!p.id) return;
    await db.plans.update(p.id, { done: !p.done, updatedAt: Date.now() });
  };

  const removePlan = async (p: PlanItem) => {
    if (!p.id) return;
    await db.plans.delete(p.id);
  };

  const onFile = async (file: File) => {
    setRecognizing(true);
    try {
      const items = await recognizePlan({ file });
      if (items.length === 0) {
        showToast('未识别到时间段');
        return;
      }
      setPreviewItems(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`识别失败：${msg}`);
    } finally {
      setRecognizing(false);
    }
  };

  const confirmImport = async () => {
    if (!previewItems) return;
    const now = Date.now();
    const items: PlanItem[] = previewItems.map((it) => {
      const matched =
        subcategories.find((s) => it.subcategoryHint && s.name.includes(it.subcategoryHint!)) ||
        subcategories.find(
          (s) =>
            SUBCATEGORY_HINT_MAP[it.subcategoryHint || '']?.includes(s.id) ||
            s.id === SUBCATEGORY_HINT_MAP[it.subcategoryHint || ''],
        );
      return {
        id: newPlanId(),
        date: dayStartTs,
        startTime: it.start,
        endTime: it.end,
        title: it.title,
        subcategoryId: matched?.id,
        done: false,
        createdAt: now,
        updatedAt: now,
      };
    });
    await db.plans.bulkAdd(items);
    showToast(`已导入 ${items.length} 项计划`);
    setPreviewItems(null);
    setOpen(true);
  };

  return (
    <section className="rounded-2xl border border-binance/20 bg-bg-card/80">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">今日计划</span>
          <span className="rounded-full bg-binance/15 px-2 py-0.5 text-[11px] text-binance">
            {plans.length > 0 ? `完成 ${doneCount}/${plans.length}` : '未添加'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            disabled={recognizing}
            className="flex items-center gap-1 rounded-full border border-binance/40 bg-binance/5 px-2.5 py-1 text-[11px] text-binance disabled:opacity-50"
          >
            {recognizing ? <span className="animate-pulse">识别中…</span> : <><FileUp size={12} /> 导入</>}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
              setOpen(true);
            }}
            className="flex items-center gap-1 rounded-full border border-line bg-bg-card2 px-2.5 py-1 text-[11px] text-text-secondary"
          >
            <Plus size={12} /> 添加
          </button>
          <ChevronDown
            size={16}
            className={`text-text-secondary transition ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.txt,.pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-4 pb-3">
              {plans.length === 0 && !adding && (
                <p className="py-6 text-center text-xs text-text-secondary">
                  还没有计划，点上方「添加」或「导入」快速填充
                </p>
              )}

              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-bg-card2 px-3 py-2"
                >
                  <button
                    onClick={() => void toggleDone(p)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      p.done
                        ? 'border-binance bg-binance text-black'
                        : 'border-line text-transparent'
                    }`}
                    aria-label="切换完成"
                  >
                    <Check size={13} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${p.done ? 'text-text-secondary line-through' : 'text-text'}`}
                    >
                      {p.title}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {p.startTime}–{p.endTime}
                      {p.subcategoryId
                        ? ` · ${subcategories.find((s) => s.id === p.subcategoryId)?.name ?? ''}`
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => void removePlan(p)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:text-red-400"
                    aria-label="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {adding && (
                <div className="rounded-xl border border-binance/30 bg-binance/5 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={draft.start}
                      onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                      className="rounded-lg border border-line bg-bg-card2 px-2 py-1.5 text-sm text-text [color-scheme:dark]"
                    />
                    <input
                      type="time"
                      value={draft.end}
                      onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                      className="rounded-lg border border-line bg-bg-card2 px-2 py-1.5 text-sm text-text [color-scheme:dark]"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="任务名称"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-line bg-bg-card2 px-2 py-1.5 text-sm text-text outline-none focus:border-binance"
                  />
                  <select
                    value={draft.subcategoryId}
                    onChange={(e) => setDraft({ ...draft, subcategoryId: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-line bg-bg-card2 px-2 py-1.5 text-sm text-text"
                  >
                    <option value="">（不关联细分领域）</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => void addPlan()}
                      className="flex-1 rounded-lg bg-binance py-1.5 text-xs font-semibold text-black"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setAdding(false);
                        setDraft({ ...draft, title: '', subcategoryId: '' });
                      }}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-secondary"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 识别结果预览 —— 完全 inline style 三段式（不依赖任何 Tailwind 任意值） */}
      <AnimatePresence>
        {previewItems && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItems(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 90,
              }}
            />
            {/* 抽屉：纯 inline style 撑开 80vh，三段式 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                margin: '0 auto',
                width: '100%',
                maxWidth: 480,
                height: '80vh',          // 显式高度，不用 max-h
                maxHeight: 720,           // 兜底
                display: 'flex',
                flexDirection: 'column',
                background: '#1a1d24',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
                zIndex: 100,
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* 标题栏：固定 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#eaecef', fontSize: 15, fontWeight: 600 }}>
                  识别到 {previewItems.length} 项
                </span>
                <button
                  onClick={() => setPreviewItems(null)}
                  style={{ background: 'none', border: 0, color: '#9ba3af', padding: 4, cursor: 'pointer' }}
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 列表区：唯一可滚 */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,           // 关键：flex 子项允许收缩
                  overflowY: 'auto',
                  padding: '12px 16px',
                  overscrollBehavior: 'contain',
                }}
              >
                {previewItems.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#22262e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ flexShrink: 0, color: '#9ba3af', fontSize: 12 }}>
                      {it.start}–{it.end}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#eaecef',
                        fontSize: 14,
                      }}
                    >
                      {it.title}
                    </span>
                    {it.subcategoryHint && (
                      <span
                        style={{
                          flexShrink: 0,
                          background: 'rgba(240,185,11,0.12)',
                          color: '#F0B90B',
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}
                      >
                        {it.subcategoryHint}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* 操作栏：固定，永远可见 */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  background: '#1a1d24',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => void confirmImport()}
                  style={{
                    flex: 1,
                    background: '#F0B90B',
                    color: '#000',
                    border: 0,
                    borderRadius: 12,
                    padding: '14px 0',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  全部导入
                </button>
                <button
                  onClick={() => setPreviewItems(null)}
                  style={{
                    background: 'transparent',
                    color: '#9ba3af',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: '14px 20px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

// 简单的 useRef 包装，便于内联使用而不用单独 import
function useFileRef() {
  return useRef<HTMLInputElement>(null);
}
