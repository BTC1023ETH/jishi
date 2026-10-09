import { useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Database,
  Download,
  FolderCog,
  Info,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { db } from '../db';
import { SLOGAN } from '../constants';
import { useAppStore } from '../store';
import { exportCSV, exportExcel, exportJSON, importJSON } from '../utils/export';
import FrameworkManager from '../components/FrameworkManager';

const VERSION = '0.1.0';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-2 px-1 text-xs font-medium text-text-secondary">{children}</h2>;
}

export default function ProfilePage() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setLoginOpen = useAppStore((s) => s.setLoginOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const showToast = useAppStore((s) => s.showToast);

  const [fwOpen, setFwOpen] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'json' | 'xlsx' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runExport = async (kind: 'csv' | 'json' | 'xlsx', fn: () => Promise<void>) => {
    if (exporting) return;
    setExporting(kind);
    try {
      await fn();
      showToast(
        kind === 'csv' ? 'CSV 已下载' : kind === 'json' ? 'JSON 已下载' : 'Excel 已下载',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`导出失败：${msg || '未知错误'}`);
      // console.error 方便排查
      // eslint-disable-next-line no-console
      console.error('[export]', kind, err);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await importJSON(file);
      showToast(`导入成功：${res.records} 条记录`);
    } catch {
      showToast('导入失败：文件格式错误');
    }
  };

  const clearData = async () => {
    if (window.confirm('确定清空所有记录数据吗？此操作不可恢复。')) {
      await db.records.clear();
      showToast('数据已清空');
    }
  };

  const inputCls =
    'rounded-xl border border-line bg-bg-card2 px-3 py-2 text-sm text-white outline-none focus:border-binance';

  return (
    <div className="mx-auto max-w-md px-5 pb-32 pt-6">
      <h1 className="mb-5 text-lg font-semibold text-text">我的</h1>

      {/* 账号 */}
      <SectionTitle>账号</SectionTitle>
      <div className="rounded-2xl border border-line bg-bg-card p-4">
        {user ? (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-card2">
                <Mail size={18} className="text-binance" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">{user.email}</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {user.syncedAt ? '已同步（本地模拟）' : '未同步'}
                </p>
              </div>
            </div>
            <button
              onClick={() => void setUser(null)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm text-text-secondary"
            >
              <LogOut size={15} /> 退出登录
            </button>
          </div>
        ) : (
          <button onClick={() => setLoginOpen(true)} className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-card2">
              <Mail size={18} className="text-binance" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-text">登录 / 注册</p>
              <p className="mt-0.5 text-xs text-text-secondary">邮箱验证码登录，本地数据与云端合并</p>
            </div>
            <ChevronRight size={18} className="text-text-secondary" />
          </button>
        )}
      </div>

      {/* 框架管理 */}
      <div className="mt-6">
        <SectionTitle>框架管理</SectionTitle>
        <button
          onClick={() => setFwOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg-card p-4"
        >
          <FolderCog size={18} className="text-binance" />
          <span className="flex-1 text-left text-sm text-text">四大框架与细分领域</span>
          <ChevronRight size={18} className="text-text-secondary" />
        </button>
      </div>

      {/* 计时与提醒 */}
      <div className="mt-6">
        <SectionTitle>计时与提醒</SectionTitle>
        <div className="space-y-3 rounded-2xl border border-line bg-bg-card p-4">
          <div className="flex items-center gap-3">
            <Moon size={16} className="text-text-secondary" />
            <span className="flex-1 text-sm text-text">睡眠时段</span>
            <input
              type="time"
              value={settings.sleepStart}
              onChange={(e) => void updateSettings({ sleepStart: e.target.value })}
              className={inputCls}
            />
            <span className="text-xs text-text-secondary">—</span>
            <input
              type="time"
              value={settings.sleepEnd}
              onChange={(e) => void updateSettings({ sleepEnd: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-3">
            <Bell size={16} className="text-text-secondary" />
            <span className="flex-1 text-sm text-text">超时提醒</span>
            <div className="flex gap-1">
              {(
                [
                  { id: '1h', label: '1 小时' },
                  { id: '4h', label: '4 小时' },
                  { id: 'off', label: '关闭' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => void updateSettings({ timeoutInterval: o.id })}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    settings.timeoutInterval === o.id
                      ? 'bg-binance font-medium text-black'
                      : 'text-text-secondary'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Bell size={16} className="text-text-secondary" />
            <span className="flex-1 text-sm text-text">忘记停止提醒</span>
            <button
              onClick={() => void updateSettings({ forgotStopReminder: !settings.forgotStopReminder })}
              className={`relative h-6 w-11 rounded-full transition ${
                settings.forgotStopReminder ? 'bg-binance' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  settings.forgotStopReminder ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            睡眠时段内不打扰；超时后跨夜顺延到醒来再提醒。
          </p>
        </div>
      </div>

      {/* 数据 */}
      <div className="mt-6">
        <SectionTitle>数据</SectionTitle>
        <div className="rounded-2xl border border-line bg-bg-card p-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => runExport('csv', exportCSV)}
              disabled={!!exporting}
              className="flex flex-col items-center gap-1 rounded-xl border border-line py-3 text-xs text-text disabled:opacity-50"
            >
              <Download size={16} className="text-binance" /> {exporting === 'csv' ? '导出中…' : 'CSV'}
            </button>
            <button
              onClick={() => runExport('json', exportJSON)}
              disabled={!!exporting}
              className="flex flex-col items-center gap-1 rounded-xl border border-line py-3 text-xs text-text disabled:opacity-50"
            >
              <Download size={16} className="text-binance" /> {exporting === 'json' ? '导出中…' : 'JSON'}
            </button>
            <button
              onClick={() => runExport('xlsx', exportExcel)}
              disabled={!!exporting}
              className="flex flex-col items-center gap-1 rounded-xl border border-line py-3 text-xs text-text disabled:opacity-50"
            >
              <Download size={16} className="text-binance" /> {exporting === 'xlsx' ? '导出中…' : 'Excel'}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-3 text-xs text-text"
            >
              <Upload size={15} className="text-binance" /> 导入 JSON
            </button>
            <button
              onClick={clearData}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-drain/40 py-3 text-xs text-drain"
            >
              <Trash2 size={15} /> 清空数据
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* 关于 */}
      <div className="mt-6">
        <SectionTitle>关于</SectionTitle>
        <div className="rounded-2xl border border-line bg-bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">迹时</p>
              <p className="mt-0.5 text-xs text-text-secondary">{SLOGAN}</p>
            </div>
            <span className="text-xs text-text-secondary">v{VERSION}</span>
          </div>
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <button
              onClick={() => showToast('反馈渠道将在后续版本开放')}
              className="flex w-full items-center gap-2 text-sm text-text-secondary"
            >
              <Info size={15} /> 反馈与建议
            </button>
            <button
              onClick={() => showToast('隐私政策：数据本地优先存储，仅在你登录后同步')}
              className="flex w-full items-center gap-2 text-sm text-text-secondary"
            >
              <ShieldCheck size={15} /> 隐私政策
            </button>
            <button
              onClick={() => showToast('本地数据存储于 IndexedDB，断网可用')}
              className="flex w-full items-center gap-2 text-sm text-text-secondary"
            >
              <Database size={15} /> 数据存储说明
            </button>
          </div>
        </div>
      </div>

      <FrameworkManager open={fwOpen} onClose={() => setFwOpen(false)} />
    </div>
  );
}
