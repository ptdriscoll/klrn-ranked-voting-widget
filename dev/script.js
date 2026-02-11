import Sortable from './vendor/sortable.esm.js';

/////////////////
// set up globals
/////////////////

const configEl = document.getElementById('csd-config');
if (!configEl) throw new Error('Missing #csd-config element');

const csdConfig = JSON.parse(configEl.textContent);
const entryItems = csdConfig.entries;
const pointsLadder = csdConfig.points;
const testMode = csdConfig.testMode;

//set form's action path
const votingForm = document.getElementById('voting-form');
votingForm.action = csdConfig.apiUrl;

//set results container
let voteResults = [];

/////////////////////
// create entry items
/////////////////////

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
  console.log(voteResults);
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

votingForm.addEventListener('submit', async function (e) {
  e.preventDefault(); //stop page from reloading

  const anyRanked = document.querySelector('.entry-item.is-ranked');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!anyRanked) {
    alert('You must rank at least one entry before submitting.');
    return;
  }

  loadingOverlay.classList.add('show'); //show loader

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
      }),
    });

    if (response.ok) {
      showThankYou();
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    loadingOverlay.classList.remove('show');
    if (!testMode) alert('Connection error. Please try again.');
    else showThankYou();
  }
});

///////////////////////////////
// handle successful submission
///////////////////////////////

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

function showThankYou() {
  const app = document.getElementById('csd-voting-app');
  const votingUI = document.getElementById('voting-ui');
  const thankYouUI = document.getElementById('thank-you-ui');

  //measure current height
  const startHeight = app.offsetHeight;

  //measure thank-you natural height
  const targetHeight = getNaturalHeight(thankYouUI);

  //lock app height
  app.style.height = startHeight + 'px';
  app.style.transition = 'height 420ms cubic-bezier(0.2, 0.8, 0.2, 1)';

  //force layout
  app.offsetHeight;

  //swap content
  votingUI.remove();
  thankYouUI.style.display = 'block';

  //fade in
  requestAnimationFrame(() => {
    thankYouUI.style.opacity = '1';
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
