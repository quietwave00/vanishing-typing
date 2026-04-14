import { getStudySet, listStudySetCategories, listStudySets, saveStudySet } from './data/study-set-repository.js';
import { VanishingTyping } from './vanishing-typing.js';
import { getFirebaseStatus } from './services/firebase-client.js';

const screenButtons = document.querySelectorAll('[data-screen-target]');
const screens = document.querySelectorAll('[data-screen]');
const typingScreen = document.querySelector('[data-screen="typing"]');
const typingTitle = document.getElementById('typing-title');
const typingSourceHint = document.getElementById('typing-source-hint');
const cycleFlash = document.getElementById('cycle-flash');
const studySetForm = document.getElementById('study-set-form');
const saveButton = document.getElementById('save-study-set');
const formStatus = document.getElementById('form-status');
const studyDateInput = document.getElementById('study-date');
const studyCategoryInput = document.getElementById('study-category');
const studySentencesInput = document.getElementById('study-sentences');
const studyTranslationsInput = document.getElementById('study-translations');
const reviewDateFilter = document.getElementById('review-date-filter');
const reviewCategoryFilter = document.getElementById('review-category-filter');
const reviewFilterStatus = document.getElementById('review-filter-status');
const reviewResultCount = document.getElementById('review-result-count');
const reviewResultsList = document.getElementById('review-results-list');
const reviewEmpty = document.getElementById('review-empty');
const startSequentialReviewButton = document.getElementById('start-sequential-review');
const startShuffleReviewButton = document.getElementById('start-shuffle-review');

const typingEngine = new VanishingTyping({
  display: document.getElementById('display'),
  input: document.getElementById('input'),
  hint: document.getElementById('hint'),
  timerBar: document.getElementById('timer-bar'),
  fadeDelay: 2000,
});

let firestoreReady = false;
let lastLookupKey = '';
let reviewState = {
  sentences: [],
  index: -1,
  mode: 'sequential',
  revealSource: false,
};

setTypingPrompt('');

function focusInput() {
  if (typingScreen.classList.contains('screen--active')) {
    typingEngine.focus();
  }
}

function showScreen(screenName) {
  screens.forEach((screen) => {
    const isActive = screen.dataset.screen === screenName;

    screen.hidden = !isActive;
    screen.classList.toggle('screen--active', isActive);
  });

  screenButtons.forEach((button) => {
    const isActive = button.dataset.screenTarget === screenName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  focusInput();
}

document.addEventListener('click', focusInput);
document.addEventListener('keydown', focusInput);
document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('keyup', handleGlobalKeyup);

screenButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    showScreen(button.dataset.screenTarget);

    if (button.dataset.screenTarget === 'review' && firestoreReady) {
      await refreshReviewResults();
    }
  });
});

studySetForm.addEventListener('submit', handleStudySetSubmit);
studyDateInput.addEventListener('change', handleLookupTrigger);
studyCategoryInput.addEventListener('change', handleLookupTrigger);
studyCategoryInput.addEventListener('blur', handleLookupTrigger);
reviewDateFilter.addEventListener('change', refreshReviewResults);
reviewCategoryFilter.addEventListener('change', refreshReviewResults);
startSequentialReviewButton.addEventListener('click', () => startReviewSession('sequential'));
startShuffleReviewButton.addEventListener('click', () => startReviewSession('shuffle'));

studyDateInput.value = getTodayDateKey();
initializeDataLayer();
showScreen('typing');

async function initializeDataLayer() {
  const status = await getFirebaseStatus();
  firestoreReady = status.ready;

  if (!status.ready) {
    reviewFilterStatus.textContent = 'Firestore 연결 후 복습 데이터를 불러올 수 있습니다.';
    return;
  }

  await populateReviewFilters();
  await refreshReviewResults();
}

async function handleStudySetSubmit(event) {
  event.preventDefault();

  const formData = new FormData(studySetForm);
  const sourceLines = parseTextareaLines(formData.get('sentences'));
  const translationLines = parseTextareaLines(formData.get('translations'));

  if (sourceLines.length === 0) {
    formStatus.textContent = '영어 문장을 한 줄 이상 입력해야 합니다.';
    return;
  }

  if (sourceLines.length !== translationLines.length) {
    formStatus.textContent = `영어 ${sourceLines.length}줄, 해석 ${translationLines.length}줄입니다. 줄 수를 맞춰 주세요.`;
    return;
  }

  const payload = {
    dateKey: String(formData.get('dateKey') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    items: sourceLines.map((sourceText, index) => ({
      sourceText,
      translationText: translationLines[index],
    })),
  };

  saveButton.disabled = true;
  formStatus.textContent = '저장 중입니다...';

  try {
    const savedSet = await saveStudySet(payload);
    formStatus.textContent = `${savedSet.dateKey} / ${savedSet.category} 저장 완료`;
    lastLookupKey = createLookupKey(savedSet.dateKey, savedSet.category);
    await populateReviewFilters();
    await refreshReviewResults();
  } catch (error) {
    formStatus.textContent = `저장 실패: ${error.message}`;
  } finally {
    saveButton.disabled = false;
  }
}

async function handleLookupTrigger() {
  if (!firestoreReady) {
    return;
  }

  const dateKey = studyDateInput.value.trim();
  const category = studyCategoryInput.value.trim();
  const lookupKey = createLookupKey(dateKey, category);

  if (!dateKey || !category) {
    lastLookupKey = '';
    return;
  }

  if (lookupKey === lastLookupKey) {
    return;
  }

  formStatus.textContent = '저장된 문장을 확인하는 중입니다...';

  try {
    const studySet = await getStudySet(dateKey, category);
    lastLookupKey = lookupKey;

    if (!studySet) {
      studySentencesInput.value = '';
      studyTranslationsInput.value = '';
      formStatus.textContent = '저장된 데이터가 없습니다. 새로 입력하면 됩니다.';
      return;
    }

    studyCategoryInput.value = studySet.category;
    studySentencesInput.value = studySet.items.map((item) => item.sourceText).join('\n');
    studyTranslationsInput.value = studySet.items.map((item) => item.translationText).join('\n');
    formStatus.textContent = `${studySet.dateKey} / ${studySet.category} 데이터를 불러왔습니다.`;
  } catch (error) {
    formStatus.textContent = `조회 실패: ${error.message}`;
  }
}

async function populateReviewFilters() {
  const sets = await listStudySets();
  const dateKeys = [...new Set(sets.map((set) => set.dateKey))];
  const categories = await listStudySetCategories();

  replaceSelectOptions(
    reviewDateFilter,
    '전체 날짜',
    dateKeys.map((dateKey) => ({ value: dateKey, label: dateKey })),
  );

  replaceSelectOptions(
    reviewCategoryFilter,
    '전체 카테고리',
    categories.map((category) => ({ value: category, label: category })),
  );
}

async function refreshReviewResults() {
  if (!firestoreReady) {
    return;
  }

  if (!reviewDateFilter.value) {
    return;
  }

  reviewFilterStatus.textContent = '복습 문장을 불러오는 중입니다...';

  try {
    const sets = await listStudySets({
      dateKey: reviewDateFilter.value,
      category: reviewCategoryFilter.value,
    });
    const flattenedSentences = flattenStudySets(sets);

    reviewState.sentences = flattenedSentences;
    reviewState.index = flattenedSentences.length > 0 ? 0 : -1;

    renderReviewResults(flattenedSentences);

    if (flattenedSentences.length === 0) {
      reviewFilterStatus.textContent = '필터에 맞는 문장이 없습니다.';
      return;
    }

    reviewFilterStatus.textContent = `${flattenedSentences.length}개의 문장을 복습할 수 있습니다.`;
  } catch (error) {
    reviewFilterStatus.textContent = `복습 데이터 조회 실패: ${error.message}`;
  }
}

function renderReviewResults(sentences) {
  reviewResultCount.textContent = `${sentences.length}개 문장`;

  if (sentences.length === 0) {
    reviewEmpty.hidden = false;
    reviewResultsList.hidden = true;
    reviewResultsList.replaceChildren();
    return;
  }

  reviewEmpty.hidden = true;
  reviewResultsList.hidden = false;
  reviewResultsList.replaceChildren(
    ...sentences.map((item) => {
      const li = document.createElement('li');
      li.textContent = `[${item.dateKey} / ${item.category}] ${item.sentence}`;
      return li;
    }),
  );
}

function startReviewSession(mode) {
  if (reviewState.sentences.length === 0) {
    reviewFilterStatus.textContent = '먼저 복습할 문장을 불러와야 합니다.';
    return;
  }

  reviewState.mode = mode;
  reviewState.revealSource = false;
  reviewState.sentences = mode === 'shuffle'
    ? shuffleItems([...reviewState.sentences])
    : [...reviewState.sentences].sort(compareReviewItems);
  reviewState.index = 0;

  reviewFilterStatus.textContent = describeCurrentReviewItem();
  syncTypingPrompt();
  showScreen('typing');
  typingEngine.reset();
  typingEngine.focus();
}

async function moveReviewSession(direction) {
  if (reviewState.sentences.length === 0) {
    return;
  }

  const lastIndex = reviewState.sentences.length - 1;
  let nextIndex = reviewState.index + direction;

  if (direction > 0 && nextIndex > lastIndex) {
    await playCycleFlash();
    nextIndex = 0;
  } else if (direction < 0 && nextIndex < 0) {
    nextIndex = lastIndex;
  }

  reviewState.index = nextIndex;
  reviewState.revealSource = false;
  reviewFilterStatus.textContent = describeCurrentReviewItem();
  syncTypingPrompt();
  showScreen('typing');
  typingEngine.reset();
  typingEngine.focus();
}

async function handleGlobalKeydown(event) {
  if (event.key === '`') {
    if (!typingScreen.classList.contains('screen--active')) {
      return;
    }

    const current = reviewState.sentences[reviewState.index];

    if (!current?.translationText) {
      return;
    }

    event.preventDefault();
    if (!reviewState.revealSource) {
      reviewState.revealSource = true;
      typingEngine.pauseFadeTimer();
      syncTypingPrompt();
    }
    return;
  }

  if (event.key !== 'Enter') {
    return;
  }

  if (!typingScreen.classList.contains('screen--active')) {
    return;
  }

  if (reviewState.sentences.length === 0 || reviewState.index < 0) {
    return;
  }

  event.preventDefault();
  await moveReviewSession(1);
}

function handleGlobalKeyup(event) {
  if (event.key !== '`') {
    return;
  }

  if (!reviewState.revealSource) {
    return;
  }

  reviewState.revealSource = false;
  typingEngine.resumeFadeTimer();
  syncTypingPrompt();
}

function describeCurrentReviewItem() {
  const current = reviewState.sentences[reviewState.index];

  if (!current) {
    return '복습 세션이 비어 있습니다.';
  }

  return `${reviewState.index + 1} / ${reviewState.sentences.length} · ${current.dateKey} · ${current.category}`;
}


function syncTypingPrompt() {
  const current = reviewState.sentences[reviewState.index];
  setTypingPrompt(current?.sentence ?? '', current?.translationText ?? '');
}

function setTypingPrompt(text, translation = '') {
  if (translation) {
    typingTitle.textContent = translation;
    typingSourceHint.textContent = text;
    typingSourceHint.hidden = !reviewState.revealSource;
    return;
  }

  typingTitle.textContent = text;
  typingSourceHint.textContent = '';
  typingSourceHint.hidden = true;
}

async function playCycleFlash() {
  cycleFlash.classList.add('is-visible');
  await wait(120);
  cycleFlash.classList.remove('is-visible');
  await wait(140);
}

function flattenStudySets(sets) {
  return sets.flatMap((set) =>
    set.items.map((item, index) => ({
      id: `${set.id}__${index}`,
      dateKey: set.dateKey,
      category: set.category,
      sentence: item.sourceText,
      translationText: item.translationText,
    })),
  );
}

function replaceSelectOptions(select, placeholder, items) {
  const currentValue = select.value;
  const nextOptions = [
    createOption('', placeholder),
    ...items.map((item) => createOption(item.value, item.label)),
  ];

  select.replaceChildren(...nextOptions);

  if (items.some((item) => item.value === currentValue)) {
    select.value = currentValue;
  }
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function shuffleItems(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}

function compareReviewItems(left, right) {
  if (left.dateKey === right.dateKey) {
    return left.category.localeCompare(right.category) || left.sentence.localeCompare(right.sentence);
  }

  return right.dateKey.localeCompare(left.dateKey);
}

function createLookupKey(dateKey, category) {
  return `${dateKey.trim()}::${category.trim().toLowerCase()}`;
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function parseTextareaLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
