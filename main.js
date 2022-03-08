// include-oljuk a NodeJS "filesystem", majd "readline" modulját
const fs = require('fs');
const reader = require('readline').createInterface({
  input: fs.createReadStream('tankolas_data.txt'),
});
const writer = fs.createWriteStream('res.txt');

const cities = [];
const tankLimit = 300;

// soronként beolvassuk a file-t,  soronként készítünk egy stringekből álló tömböt (elválasztás egy vagy több SPACE esetén) és hozzá is adjuk a "cities" tömbünkhöz
reader.on('line', (line) => {
  cities.push(line.split(/\s+/));
});
// jelenleg van egy "cities" nevű tömbünk, amely tömböket tartalmaz a következő modell alapján (minden string típusú): [város neve, benzin ára, fogyasztás következő városig]

// amint befejeződött a file beolvasása el is kezdhetjük a számolást
reader.on('close', () => {
  //console.log(cities);
  main(cities);
});

function main(cities) {
  const result = ['Eredmény:'];
  let matrix = createMatrix(cities);
  matrix = solveFirstPhase(matrix);

  const lastRowIndex = matrix.length - 1;
  const lastColIndex = matrix[lastRowIndex].length - 1;
  if (matrix[lastRowIndex][lastColIndex] !== 0) {
    result[1] =
      'Bizonyos feltételek nem tudnak egyszerre teljesülni! (első leállási tábla)';
  }

  result.forEach((city) => {
    writer.write(city); //.join('    ')
    writer.write('\n');
  });
}

function createMatrix(cities) {
  const matrix = [];

  // felső sor labeljeinek felvétele:
  const topLabels = cities.map((city) => city[0]);
  for (let i = 0; i < cities.length; i++) topLabels.push(`v${i + 1}`);
  for (let i = 0; i < 2 * cities.length; i++)
    topLabels.push(i < cities.length ? `u${i + 1}*` : `u${i + 1}`);
  topLabels.unshift('');
  topLabels.push('b');
  matrix.push(topLabels);

  //megkötések felvitele:

  for (let i = 0; i < 2 * cities.length; i++) {
    //elég legyen az üzemanyag a következő városig
    if (i < cities.length) {
      const row = topLabels.map((label) => {
        const labelIndex = topLabels.indexOf(label) - 1;
        switch (labelIndex) {
          // oszlop labelek
          case -1:
            return `u${i + 1}*`;
          // döntési változók
          case i:
            return 1;
          // v-k a "saját soraikban"
          case i + cities.length:
            return -1;
          // v-k a "következő sorban, kivéve az elsőben"
          case i + cities.length - 1:
            return i !== 0 ? 1 : 0;
          // u*-ok
          case i + 2 * cities.length:
            return 1;
          // b vektor
          case 4 * cities.length:
            return Number(cities[i][2]);

          default:
            return 0;
        }
      });
      matrix.push(row);
    }
    //üzemanyagmennyiség nem lépheti át a limitet (jelen esetben 300)
    else {
      const row = topLabels.map((label) => {
        const labelIndex = topLabels.indexOf(label) - 1;
        switch (labelIndex) {
          // oszlop labelek
          case -1:
            return `u${i + 1}`;
          // döntési változók
          case i - cities.length:
            return 1;
          // v-k a "következő sorban, kivéve az elsőben"
          case i - 1:
            return i !== cities.length ? 1 : 0;
          // u-k
          case i + 2 * cities.length:
            return 1;
          // b vektor
          case 4 * cities.length:
            return tankLimit;

          default:
            return 0;
        }
      });
      matrix.push(row);
    }
  }

  // célfüggvény felvitele:
  const targetRow = topLabels.map((label) => {
    const labelIndex = topLabels.indexOf(label);
    if (labelIndex === 0) {
      return 'z';
    } else if (labelIndex > 0 && labelIndex <= cities.length) {
      return -1 * Number(cities[labelIndex - 1][1]);
    } else {
      return 0;
    }
  });
  matrix.push(targetRow);

  // alternatív célfüggvény felvitele:
  const conditionRows = matrix.filter((row) => row[0].includes('*'));
  const alternativeTargetRow = sumOfRows(conditionRows);
  alternativeTargetRow[0] = 'z2';
  for (let i = 0; i < alternativeTargetRow.length; i++) {
    if (i > cities.length * 2 && i !== topLabels.length - 1) {
      alternativeTargetRow[i] = 0;
    }
  }
  matrix.push(alternativeTargetRow);

  console.table('INITIAL TABLE');
  console.table(matrix);
  return matrix;
}

function solveFirstPhase(matrix) {
  for (let j = 1; j < (matrix[0].length - 2) / 4 + 1; j++) {
    const pivotItem = matrix[j][j];
    const pivotRow = matrix[j];

    // mivel mindenhol 1 van, ez a for loop igazából felesleges
    for (let i = 1; i < pivotRow.length - 1; i++) {
      pivotRow[i] /= pivotItem;
    }

    matrix[j][0] = matrix[0][j];

    for (let i = 1; i < matrix.length; i++) {
      if (matrix[i][j] === 0 || i === j) {
        continue;
      }
      const number = matrix[i][j] / pivotItem;
      matrix[i] = differenceOfRows([matrix[i], pivotRow], number);
    }

    console.table(matrix);
  }
  console.log('END OF FIRST PHASE');
  return matrix;
}

// összead sorokat (akármennyit)
function sumOfRows(rows) {
  // (a reduce() (beépített JS tömb metódus) végigmegy egy tömbön, és mindig számon tartja az előző elemet, így rendkívül egyszerűvé teszi többek között egy tömb elemeinek összeadását)
  return rows.reduce((previuosRow, row) => {
    if (!previuosRow) {
      return;
    }
    const sum = [];
    for (let i = 0; i < row.length; i++) {
      sum.push(row[i] + previuosRow[i]);
    }
    return sum;
  });
}

// kivonja az első sorból a második sor számszorosát (csak 2 sorral működik, így kicsit feleslegessé válik a reduce(), lehetne szerintem szebben is, de lusta vagyok)
function differenceOfRows(rows, number = 1) {
  return rows.reduce((previuosRow, row) => {
    if (!previuosRow) {
      return;
    }
    const diff = [];
    for (let i = 0; i < row.length; i++) {
      diff.push(
        typeof row[i] === 'number'
          ? previuosRow[i] - number * row[i]
          : previuosRow[i]
      );
    }
    return diff;
  });
}
