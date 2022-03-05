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
  solve(cities);
});

function solve(cities) {
  const matrix = createMatrix(cities);
  console.log(matrix);
  /* cities.forEach((city) => {
    writer.write(city.join('    '));
    writer.write('\n');
  }); */
}

const createMatrix = (cities) => {
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
          case -1:
            return `u${i + 1}*`;

          case i:
            return 1;

          case i + cities.length:
            return -1;

          case i + cities.length - 1:
            return i !== 0 ? 1 : 0;

          case i + 2 * cities.length:
            return 1;

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
          case -1:
            return `u${i + 1}`;

          case i - cities.length:
            return 1;

          case i - 1:
            return i !== cities.length ? 1 : 0;

          case i + 2 * cities.length:
            return 1;

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
  const alternativeTargetRow;
  matrix.push(alternativeTargetRow);

  return matrix;
};
