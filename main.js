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
  const constraint = cities.filter((city) => city[2] > tankLimit); // h atúl kicsi a tank, el se kezdjük a megoldást
  if (constraint.length) {
    writer.write('Nem megoldható a feladat, túl kicsi a tank.');
    return;
  }

  let matrix = createMatrix(cities);

  matrix = solveFirstPhase(matrix);

  const lastRowIndex = matrix.length - 1;
  const lastColIndex = matrix[lastRowIndex].length - 1;
  // ha az első leállási tábla vélfüggvényének értéke nem 0, akkor a feladat nem megoldható
  if (matrix[lastRowIndex][lastColIndex] !== 0) {
    writer.write(
      'Bizonyos feltételek nem tudnak egyszerre teljesülni! (első leállási tábla)'
    );
    return;
  }

  matrix = solveSecondPhase(matrix);

  // ha a visszakapott érték nem egy tömb, akkor hibába futottunk, ezt fogjuk kiírni
  if (!Array.isArray(matrix)) {
    writer.write(matrix);
  }

  // ha minden rendben lefutott kiírjuk a városokat, illetve hogy mennyit kell bennük tankolni
  const cityNames = cities.map((city) => city[0]);
  for (let i = 0; i < matrix.length; i++) {
    if (!cityNames.includes(matrix[i][0])) {
      continue;
    }
    writer.write(matrix[i][0] + '    ' + matrix[i][matrix[i].length - 1]);
    writer.write('\n');
  }
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
  const conditionRows = matrix.filter((row) => row[0].includes('*')); // kiszűrjük azokat a sorokat, amelyek label-je tartalmaz *-ot
  const alternativeTargetRow = sumOfRows(conditionRows);
  alternativeTargetRow[0] = 'z2';
  for (let i = 0; i < alternativeTargetRow.length; i++) {
    if (i > cities.length * 2 && i !== topLabels.length - 1) {
      alternativeTargetRow[i] = 0; // kinullázzuk a sima "u" értékeket
    }
  }
  matrix.push(alternativeTargetRow);

  console.log('INITIAL TABLE');
  console.table(matrix);
  return matrix;
}

function solveFirstPhase(matrix) {
  for (let j = 1; j < (matrix[0].length - 2) / 4 + 1; j++) {
    pivot(matrix, [j, j]); // pivotálást hajt végre, első argumentum a mátrix, második argumentum egy tömb, amely a pivot elem koordinátáit tartalmazza
    // ennél a feladatnál az első tábla pivot elemei mindig ezek lesznek (feltéve, hogy egyik távolság sem nagyobb mint a tankunk kapacitása, bár ebben az esetben alapból megoldhatatlan a feladat)
    console.table(matrix);
  }
  console.log('END OF FIRST PHASE');
  return matrix;
}

function solveSecondPhase(matrix) {
  const labelRow = matrix[0];

  // 'kitisztítjuk' a mátrixunkat, *-os elemeket kivesszük
  matrix.pop(); // utolsó sor leválasztása
  let first; // megkeressük az első csillagos elemet, igazából ez is jó lenne: labelRow.indexOf('u1*')
  for (let i = 0; i < labelRow.length; i++) {
    first = labelRow.indexOf(labelRow[i]);
    if (labelRow[i].includes('*')) {
      break;
    }
  }
  const count = labelRow.filter((item) => item.includes('*')).length; // megszámoljuk, hány *-os elem van
  // az első *-os elemtől kezdve, eltávolítunk annyi elemet, ahány csillagos elem van
  matrix.forEach((row) => {
    row.splice(first, count);
  });
  // eltávolítottuk az alternatív célfüggvényt, illetve az összes u*-ot

  let solving = true;

  while (solving) {
    const targetRow = matrix[matrix.length - 1];
    const targetRowNoLabel = [...targetRow]; // lemásoljuk a targetRow-t, az eredetit nem akarjuk változtatni
    targetRowNoLabel.shift(); // leválasztjuk az első értéket
    targetRowNoLabel.pop(); // leválasztjuk az utolsó értéket

    // Meghatározzuk a generálóelem oszlopát, a legnagyobb érték helye a célfv. sorában
    const max = targetRowNoLabel.reduce((a, b) => {
      return Math.max(a, b);
    }, -Infinity);
    // Ha a célfüggvény legnagyobb értéke nem pozitív, akkor készen vagyunk
    if (max <= 0) {
      solving = false;
      console.log('FINISHED!');
      return matrix;
    }

    const col = targetRow.indexOf(max);
    // szűk keresztmetszet meghatározása
    let bottleneck = [];
    for (let i = 1; i < matrix.length - 1; i++) {
      const ratio = matrix[i][matrix[i].length - 1] / matrix[i][col];
      bottleneck.push(ratio);
    }
    const min = bottleneck.reduce((a, b) => {
      if (a <= 0) {
        return b;
      }
      return Math.min(a, b);
    }, Infinity);
    // ha idáig eljutottunk, azaz a célfüggvény sorában van pozitív érték, azonban az összes szűk keresztmetszet negatív, a célfüggvény nem korlátos
    if (min < 0) {
      solving = false;
      return 'Nem korlátos célfüggvény!';
    }

    const row = bottleneck.indexOf(min) + 1; // +1 mert van egy label is

    pivot(matrix, [row, col]);

    console.table(matrix);
  }
}
// egy pivotálást hajt végre a bemeneti mátrixon, második argumentuma egy tömb, a generáló elem koordinátáival
function pivot(matrix, [row, col]) {
  const pivotItem = matrix[row][col];
  const pivotRow = matrix[row];

  // leosztjuk a pivot elem sorának elemeit a pivot elemmel
  for (let i = 1; i < pivotRow.length; i++) {
    pivotRow[i] /= pivotItem;
  }

  matrix[row][0] = matrix[0][col]; // pivot elem oszlopának label-jét bevisszük a bázis label-ekhez

  // többi sorból kivonjuk a pivot sor számszorosát, úgy, hogy a pivot elem oszlopában a többi értéket kinullázzuk
  for (let i = 1; i < matrix.length; i++) {
    if (i === row) {
      continue;
    }
    const number = matrix[i][col] / pivotItem;
    matrix[i] = differenceOfRows([matrix[i], pivotRow], number);
  }
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
