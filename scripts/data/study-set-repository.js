import { getFirebaseContext } from '../services/firebase-client.js';

const COLLECTION_NAME = 'studySets';

export async function saveStudySet(input) {
  const payload = normalizeStudySet(input);
  const { db, sdk } = await getFirebaseContext();
  const documentId = createStudySetId(payload.dateKey, payload.category);
  const documentRef = sdk.doc(db, COLLECTION_NAME, documentId);
  const existingSnapshot = await sdk.getDoc(documentRef);

  await sdk.setDoc(
    documentRef,
      {
        ...payload,
        sentenceCount: payload.items.length,
        updatedAt: sdk.serverTimestamp(),
        createdAt: existingSnapshot.exists() ? existingSnapshot.data().createdAt : sdk.serverTimestamp(),
      },
    { merge: true },
  );

  return {
    id: documentId,
    ...payload,
  };
}

export async function getStudySet(dateKey, category) {
  const normalizedDateKey = String(dateKey ?? '').trim();
  const normalizedCategory = String(category ?? '').trim().toLowerCase();

  if (!normalizedDateKey || !normalizedCategory) {
    return null;
  }

  const { db, sdk } = await getFirebaseContext();
  const documentRef = sdk.doc(db, COLLECTION_NAME, createStudySetId(normalizedDateKey, normalizedCategory));
  const snapshot = await sdk.getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapStudySet(snapshot);
}

export async function listStudySets(filters = {}) {
  const { db, sdk } = await getFirebaseContext();
  const snapshot = await sdk.getDocs(
    sdk.query(sdk.collection(db, COLLECTION_NAME), sdk.orderBy('dateKey', 'desc')),
  );

  return snapshot.docs
    .map((docSnapshot) => mapStudySet(docSnapshot))
    .filter((set) => {
      const matchesDate = !filters.dateKey || set.dateKey === filters.dateKey;
      const normalizedCategory = String(filters.category ?? '').trim().toLowerCase();
      const matchesCategory = !normalizedCategory || set.category === normalizedCategory;

      return matchesDate && matchesCategory;
    })
    .sort((left, right) => {
      if (left.dateKey === right.dateKey) {
        return left.category.localeCompare(right.category);
      }

      return right.dateKey.localeCompare(left.dateKey);
    });
}

export async function listStudySetCategories() {
  const sets = await listStudySets();
  return [...new Set(sets.map((set) => set.category))];
}

export async function getLatestStudySet() {
  const sets = await listStudySets();
  return sets[0] ?? null;
}

function normalizeStudySet(input) {
  const dateKey = String(input.dateKey ?? '').trim();
  const category = String(input.category ?? '').trim().toLowerCase();
  const items = (input.items ?? [])
    .map((item) => ({
      sourceText: String(item?.sourceText ?? '').trim(),
      translationText: String(item?.translationText ?? '').trim(),
    }))
    .filter((item) => item.sourceText || item.translationText);

  if (!dateKey) {
    throw new Error('dateKey is required.');
  }

  if (!category) {
    throw new Error('category is required.');
  }

  if (items.length === 0) {
    throw new Error('At least one sentence pair is required.');
  }

  const hasIncompleteItem = items.some((item) => !item.sourceText || !item.translationText);

  if (hasIncompleteItem) {
    throw new Error('Each sentence pair must include both sourceText and translationText.');
  }

  return {
    dateKey,
    category,
    items,
  };
}

function createStudySetId(dateKey, category) {
  return `${dateKey}__${slugify(category)}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapStudySet(docSnapshot) {
  const data = docSnapshot.data();
  const items = normalizeStoredItems(data);

  return {
    id: docSnapshot.id,
    ...data,
    items,
  };
}

function normalizeStoredItems(data) {
  if (Array.isArray(data.items) && data.items.length > 0) {
    return data.items
      .map((item) => ({
        sourceText: String(item?.sourceText ?? '').trim(),
        translationText: String(item?.translationText ?? '').trim(),
      }))
      .filter((item) => item.sourceText || item.translationText);
  }

  return (data.sentences ?? [])
    .map((sentence) => String(sentence ?? '').trim())
    .filter(Boolean)
    .map((sourceText) => ({
      sourceText,
      translationText: '',
    }));
}
