import { openDB } from 'idb';

const dbPromise = openDB('nexora-app-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('keyval')) {
      db.createObjectStore('keyval');
    }
  },
});

export async function idbGet(key) {
  return (await dbPromise).get('keyval', key);
}

export async function idbSet(key, val) {
  return (await dbPromise).put('keyval', val, key);
}

export async function idbDel(key) {
  return (await dbPromise).delete('keyval', key);
}