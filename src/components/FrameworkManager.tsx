import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import { newId } from '../utils/records';
import BottomSheet from './BottomSheet';

const PRESET_COLORS = ['#F0A020', '#F0B90B', '#2EBD85', '#4A9EFF', '#F6465D', '#9C88FF', '#E84393', '#848E9C'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FrameworkManager({ open, onClose }: Props) {
  const frameworks = useLiveQuery(() => db.frameworks.orderBy('order').toArray(), []);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('order').toArray(), []);

  const addFramework = async () => {
    const order = frameworks?.length ?? 0;
    await db.frameworks.add({ id: newId(), name: `新框架 ${order + 1}`, color: '#F0B90B', order });
  };

  const renameFw = async (id: string, name: string) => {
    if (name.trim()) await db.frameworks.update(id, { name: name.trim() });
  };

  const setColor = async (id: string, color: string) => {
    await db.frameworks.update(id, { color });
  };

  const deleteFw = async (id: string) => {
    await db.transaction('rw', db.frameworks, db.subcategories, async () => {
      await db.frameworks.delete(id);
      await db.subcategories.where('frameworkId').equals(id).delete();
    });
  };

  const addSub = async (frameworkId: string) => {
    const subs = (subcategories ?? []).filter((s) => s.frameworkId === frameworkId);
    await db.subcategories.add({ id: newId(), frameworkId, name: `新细分 ${subs.length + 1}`, order: subs.length });
  };

  const renameSub = async (id: string, name: string) => {
    if (name.trim()) await db.subcategories.update(id, { name: name.trim() });
  };

  const deleteSub = async (id: string) => {
    await db.subcategories.delete(id);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="框架管理">
      <div className="space-y-3 pb-2">
        {(frameworks ?? []).map((fw) => {
          const subs = (subcategories ?? [])
            .filter((s) => s.frameworkId === fw.id)
            .sort((a, b) => a.order - b.order);
          return (
            <div key={fw.id} className="rounded-xl border border-line bg-bg-card2 p-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: fw.color }} />
                <input
                  defaultValue={fw.name}
                  key={fw.id + ':' + fw.name}
                  onBlur={(e) => renameFw(fw.id, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none"
                />
                <button onClick={() => deleteFw(fw.id)} className="shrink-0 text-text-secondary hover:text-drain">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(fw.id, c)}
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor: c,
                      outline: fw.color === c ? '2px solid #EAECEF' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {subs.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-xs text-text-secondary"
                  >
                    <input
                      defaultValue={s.name}
                      key={s.id + ':' + s.name}
                      onBlur={(e) => renameSub(s.id, e.target.value)}
                      className="w-14 bg-transparent text-xs text-text outline-none"
                    />
                    <button onClick={() => deleteSub(s.id)} className="text-text-secondary hover:text-drain">
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => addSub(fw.id)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-1 text-xs text-text-secondary"
                >
                  <Plus size={12} /> 细分
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={addFramework}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-line py-3 text-sm text-text-secondary"
        >
          <Plus size={16} /> 新增框架
        </button>
      </div>
    </BottomSheet>
  );
}
