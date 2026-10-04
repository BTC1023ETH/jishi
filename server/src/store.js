import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 第一版账号存储：本地 JSON 文件。
 * 生产多实例 / 高并发时，建议替换为 MySQL / PostgreSQL。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');

let users = new Map();

function load() {
  if (existsSync(USERS_FILE)) {
    try {
      const arr = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
      users = new Map(arr.map((u) => [u.email, u]));
    } catch {
      users = new Map();
    }
  }
}

function persist() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify([...users.values()], null, 2), 'utf-8');
}

load();

export function findUser(email) {
  return users.get(email) ?? null;
}

export function createUser(email) {
  const now = new Date().toISOString();
  const user = { email, createdAt: now, updatedAt: now };
  users.set(email, user);
  persist();
  return user;
}
