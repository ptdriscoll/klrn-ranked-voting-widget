import Sortable from './vendor/sortable.esm.js';

/////////////////
// set up globals
/////////////////

//set user vote tracking
const VOTE_KEY = 'csd-uv';
const pageLoadedAt = Date.now();
const runtimeToken = crypto.randomUUID(); 
let activePeriod = null;
let isSubmitting = false;

//get config values
const configEl = document.getElementById('csd-config');
if (!configEl) throw new Error('Missing #csd-config element');
const csdConfig = JSON.parse(configEl.textContent);
const entryItems = csdConfig.entries;
const pointsLadder = csdConfig.points;
const testMode = csdConfig.testMode;
const votingPeriods = csdConfig.votingPeriods.map((subArray) =>
  subArray.map((dateStr) => dateStr.replace(/\s/g, '')),
);

//freeze to prevent tampering
Object.freeze(csdConfig);
Object.freeze(entryItems);
Object.freeze(pointsLadder);
Object.freeze(votingPeriods);

//set form's action path
const votingForm = document.getElementById('voting-form');
votingForm.action = csdConfig.apiUrl;

//set results container
let voteResults = [];

//////////
// helpers
//////////

function getFingerprint() {
  return btoa([
    navigator.userAgent,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join('|'));
}

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );
  return match ? match[2] : null;
}

function storageAvailable() {
  try {
    const key = '__storage_test__';
    localStorage.setItem(key, key);
    localStorage.removeItem(key);
    return navigator.cookieEnabled;
  } catch {
    return false;
  }
}

function markVoted(period) {
  const data = btoa(JSON.stringify({
    p: period.start,
    f: getFingerprint()
  }));
  localStorage.setItem(VOTE_KEY, data);

  const expires = new Date(period.end).toUTCString();
  document.cookie =
    `${VOTE_KEY}=${data}; expires=${expires}; path=/; SameSite=Lax`;
}

function hasVoted(period) {
  try {
    const ls = localStorage.getItem(VOTE_KEY);
    const cookie = getCookie(VOTE_KEY);

    if (!ls || !cookie || ls !== cookie) return false;

    const data = JSON.parse(atob(ls));
    
    return (
      data.p === period.start &&
      data.f === getFingerprint()
    );
  } catch {
    return false;
  }
}

function getActiveVotingPeriod(periods, now) {
  for (const [start, end] of periods) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    if (now >= startMs && now <= endMs) {
      return { start, end };
    }
  }

  return null;
}

//////////////
// voting gate
//////////////

function votingGate() {
  if (!storageAvailable()) {
    showVotingState('Voting requires cookies and local storage.');
    return false;
  }

  activePeriod = getActiveVotingPeriod(votingPeriods, pageLoadedAt);
  
  if (!activePeriod) {
    showVotingState('Voting is currently closed.');
    return false;
  } 
  
  if (hasVoted(activePeriod)) {
    showVotingState('You have already voted. Thank you for participating!');
    return false;
  }
  
  return true;
}

if (!votingGate()) throw new Error('Access Denied.');

/////////////////////
// create entry items
/////////////////////

const votingUI = document.getElementById('voting-ui');
const listEl = document.getElementById('entry-list');
const template = document.getElementById('entry-template');

entryItems.forEach((entry) => {
  const node = template.content.cloneNode(true);
  const item = node.querySelector('.entry-item');
  const name = item.querySelector('.entry-name');

  item.dataset.id = entry.id;
  name.textContent = entry.name;
  listEl.appendChild(node);
});
  
votingUI.style.visibility = 'visible';
requestAnimationFrame(() => {
  votingUI.style.opacity = '1';
});

/////////////////////
// dragable interface
/////////////////////

//initialize SortableJS on entry-list
Sortable.create(listEl, {
  animation: 150,
  draggable: '.entry-item',
  ghostClass: 'sortable-ghost',
  forceFallback: true, //don't use browser's HTML5 drag and drop
  fallbackTolerance: 5, //add small buffer so clicks aren't drags

  //auto scroll while dragging
  scroll: true,
  scrollSensitivity: 120,
  scrollSpeed: 16,

  //mobile touch behavior, to prevent accidental scroll grabs
  delay: 100,
  delayOnTouchOnly: true,
  touchStartThreshold: 5,

  onEnd(evt) {
    evt.item.classList.add('is-ranked');
    updateScores();
  },
});

function updateScores() {
  const items = document.querySelectorAll('.entry-item');
  const voteState = [];

  items.forEach((item, index) => {
    const scoreBadge = item.querySelector('.score-badge');

    if (item.classList.contains('is-ranked')) {
      const points = pointsLadder[index];

      if (scoreBadge.innerText !== String(points)) {
        scoreBadge.innerText = points;
        scoreBadge.classList.remove('score-changed');
        void scoreBadge.offsetWidth;
        scoreBadge.classList.add('score-changed');
      }

      scoreBadge.dataset.points = points;
    }

    voteState.push({
      id: parseInt(item.dataset.id, 10),
      voted: item.classList.contains('is-ranked'),
    });
  });

  voteResults = voteState;
  //console.log(voteResults);
}

//////////////////////
// zip code validation
//////////////////////

const zipCode = document.getElementById('zip-code');

if (zipCode) {
  zipCode.addEventListener('input', (e) => {
    const value = e.target.value;

    if (value === '') {
      zipCode.setCustomValidity('');
      return;
    }

    if (!/^\d+$/.test(value)) {
      zipCode.setCustomValidity('You must enter only numbers');
      zipCode.reportValidity();
    } else if (value.length !== 5) {
      zipCode.setCustomValidity('Be sure to enter 5 numbers');
    } else {
      zipCode.setCustomValidity('');
    }
  });
}

//////////////////
// form submission
//////////////////

//helper
function canSubmitVote() {
  if (!activePeriod) return false; //if in voting period
  if (isSubmitting) return false; //submit lock
  if (!storageAvailable()) return false; //double check
  if (votingForm['phone-number']?.value) return false; //honeypot
  if (Date.now() - pageLoadedAt < 3000) return false; //timing
  return true;
}

votingForm.addEventListener('submit', async function (e) {
  e.preventDefault(); //stop page from reloading

  const anyRanked = document.querySelector('.entry-item.is-ranked');
  const loadingOverlay = document.getElementById('loading-overlay');
  
  if (!canSubmitVote()) {
    showVotingState('We could not process your vote. Please try again.');
    return;
  }  
  
  //multi-tab lock
  if (localStorage.getItem('csd-vote-lock')) {
    showVotingState('Your vote has already been submitted.');
    return false;
  }  

  if (!anyRanked) {
    alert('You must rank at least one entry before submitting.');
    return;
  }
  
  votingForm.querySelector('button[type="submit"]').disabled = true;  
  loadingOverlay.classList.add('show'); //show loader
  isSubmitting = true;
  
  //send POST to server
  try {
    const response = await fetch('submit_vote.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        votes: voteResults,
        zip: zipCode ? zipCode.value.trim() : '',
        token: runtimeToken,
        fingerprint: getFingerprint()
      }),
    });

    if (response.ok) {
      markVoted(activePeriod);
      localStorage.setItem('csd-vote-lock', '1'); //multi-tab lock
      showVotingState();
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    isSubmitting = false;
    loadingOverlay.classList.remove('show');
    if (!testMode) alert('Connection error. Please try again.');
    else {
      markVoted(activePeriod);
      showVotingState();
    }
  }
});

//////////////////////
// handle voting state
//////////////////////

//helper
function getNaturalHeight(el) {
  const prev = {
    display: el.style.display,
    visibility: el.style.visibility,
    position: el.style.position,
    pointerEvents: el.style.pointerEvents,
  };

  el.style.display = 'block';
  el.style.visibility = 'hidden';
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';

  const h = el.offsetHeight;

  Object.assign(el.style, prev);
  return h;
}

function showVotingState(message) {
  const app = document.getElementById('csd-voting-app');
  const votingUI = document.getElementById('voting-ui');
  const votingStateUI = document.getElementById('voting-state-ui');
  
  if (message) votingStateUI.querySelector('h2').innerText = message;

  const startHeight = app.offsetHeight;
  const targetHeight = getNaturalHeight(votingStateUI);

  app.style.height = startHeight + 'px';
  app.style.transition = 'height 420ms cubic-bezier(0.2, 0.8, 0.2, 1)';

  //force layout
  app.offsetHeight;

  //swap content
  votingUI.remove();
  votingStateUI.style.display = 'block';

  //fade in
  requestAnimationFrame(() => {
    votingStateUI.style.opacity = '1';
    app.style.height = targetHeight + 'px';
  });

  //cleanup
  app.addEventListener(
    'transitionend',
    () => {
      app.style.height = 'auto';
      app.style.transition = '';
    },
    { once: true },
  );
}
