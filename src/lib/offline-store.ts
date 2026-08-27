interface CachedCourseInput {
  slug: string;
  title: string;
  description: string | null;
  teacherName: string | null;
}

interface CachedCourse extends CachedCourseInput {
  cachedAt: number;
}

const DB_NAME = "modern-elearning-offline";
const DB_VERSION = 1;
const COURSE_STORE = "courses";
const PROGRESS_STORE = "progress";

function dbError(request: IDBRequest | IDBOpenDBRequest): Error {
  return new Error(request.error?.message ?? "IndexedDB request failed");
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(COURSE_STORE)) {
        db.createObjectStore(COURSE_STORE, { keyPath: "slug" });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: "activityId" });
      }
    };
  });
}

export async function saveCourseForOffline(course: CachedCourseInput) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(COURSE_STORE, "readwrite");
    const store = tx.objectStore(COURSE_STORE);
    const request = store.put({ ...course, cachedAt: Date.now() });
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve();
  });
}

export async function getOfflineCourse(
  slug: string,
): Promise<CachedCourse | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COURSE_STORE, "readonly");
    const store = tx.objectStore(COURSE_STORE);
    const request = store.get(slug);
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve((request.result as CachedCourse) ?? null);
  });
}

export async function listOfflineCourses(): Promise<CachedCourse[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COURSE_STORE, "readonly");
    const store = tx.objectStore(COURSE_STORE);
    const request = store.getAll();
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve((request.result as CachedCourse[]) ?? []);
  });
}

export async function clearOfflineCourse(slug: string) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(COURSE_STORE, "readwrite");
    const store = tx.objectStore(COURSE_STORE);
    const request = store.delete(slug);
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve();
  });
}

interface CachedProgress {
  activityId: number;
  completed: boolean;
  timeSpentSecs: number;
  updatedAt: number;
}

export async function saveProgressForSync(progress: CachedProgress) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, "readwrite");
    const store = tx.objectStore(PROGRESS_STORE);
    const request = store.put({ ...progress, updatedAt: Date.now() });
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve();
  });
}

export async function getPendingProgress(): Promise<CachedProgress[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, "readonly");
    const store = tx.objectStore(PROGRESS_STORE);
    const request = store.getAll();
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () =>
      resolve((request.result as CachedProgress[]) ?? []);
  });
}

export async function clearPendingProgress(activityId: number) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, "readwrite");
    const store = tx.objectStore(PROGRESS_STORE);
    const request = store.delete(activityId);
    request.onerror = () => reject(dbError(request));
    request.onsuccess = () => resolve();
  });
}
