const districtHeader = document.querySelector('#district');
const contestantHeader = document.querySelector('#contestant');
const votesHeader = document.querySelector('#votes');
const table = document.querySelector('#results table');

if (contestantHeader && votesHeader && table) {
  districtHeader.addEventListener('click', (e) => tableSort(0));
  contestantHeader.addEventListener('click', (e) => tableSort(1));
  votesHeader.addEventListener('click', (e) => tableSort(2));
}

function tableSort(col) {
  let rows = table.rows;
  toSort = [];

  //put row content and indices into array of arrays
  for (let i = 1; i < rows.length; i++) {
    let content = rows[i].getElementsByTagName('TD')[col].innerHTML;
    if (col === 1) content = content.toLowerCase();
    else content = Number(content);
    toSort.push([content, i]);
  }

  //now sort array of arrays using insertion sort
  //start with ascending, but reverse if array was already sorted ascending
  [result, wasAscSorted] = insertionSort(toSort, (asc = true));
  if (wasAscSorted) {
    [result, wasAscSorted] = insertionSort(toSort, (asc = false));
  }

  //use sorted result to sort table in dom
  //use i - 1 as index in result array since it doesn't include headers
  let rowsCopy = table.cloneNode(true).rows;
  for (let i = 1; i < rows.length; i++) {
    let rowCopy = rowsCopy[result[i - 1][1]].cloneNode(true);
    rows[i].replaceWith(rowCopy);
  }
  rowsCopy = null;
  rowCopy = null;

  return result;
}

//sorts as ascending on first pass, but will then reverse
//if array was already sorted as ascending
function insertionSort(array, asc = true) {
  let wasAscSorted = true;

  for (let i = 1; i < array.length; i++) {
    let curr = array[i];
    let j = i - 1;

    if (asc) {
      while (j >= 0 && array[j][0] > curr[0]) {
        array[j + 1] = array[j];
        wasAscSorted = false;
        j--;
      }
    } else {
      while (j >= 0 && array[j][0] < curr[0]) {
        array[j + 1] = array[j];
        j--;
      }
    }

    array[j + 1] = curr;
  }
  return [array, wasAscSorted];
}
