const fs = require("fs");
const vm = require("vm");

const context = {};
vm.runInNewContext(
  `${fs.readFileSync("data.js", "utf8")}\n${fs.readFileSync("cities-extra.js", "utf8")}\n${fs.readFileSync("cities-more.js", "utf8")}\nglobalThis.payload = { QUESTIONS, CITY_DATA, AXIS_META };`,
  context
);

const { QUESTIONS, CITY_DATA, AXIS_META } = context.payload;
const axes = Object.keys(AXIS_META);
const maxScores = QUESTIONS.reduce((totals, question) => {
  axes.forEach((axis) => {
    totals[axis] = (totals[axis] || 0) + Math.max(0, ...question.options.map((option) => option.scores?.[axis] || 0));
  });
  return totals;
}, {});

function rank(answers) {
  const raw = Object.fromEntries(axes.map((axis) => [axis, 0]));
  const practical = { crowd: 2, walking: 2, climate: "any", budget: 2 };
  answers.forEach((answerIndex, questionIndex) => {
    const option = QUESTIONS[questionIndex].options[answerIndex];
    Object.entries(option.scores || {}).forEach(([axis, score]) => { raw[axis] += score; });
    Object.assign(practical, option.practical || {});
  });
  const rawPeak = Math.max(1, ...Object.values(raw));
  const rawTotal = Math.max(1, Object.values(raw).reduce((sum, value) => sum + value, 0));
  const profile = Object.fromEntries(axes.map((axis) => [axis, raw[axis] / rawPeak * 5]));
  const profileShare = Object.fromEntries(axes.map((axis) => [axis, raw[axis] / rawTotal]));
  return CITY_DATA.map((city) => {
    const cityTotal = Object.values(city.vector).reduce((sum, value) => sum + value, 0);
    const distance = axes.reduce((sum, axis) => sum + Math.abs(profileShare[axis] - city.vector[axis] / cityTotal), 0);
    const affinity = 100 * (1 - distance / 2);
    let practicalFit = 100;
    if (city.practical.crowd > practical.crowd) practicalFit -= (city.practical.crowd - practical.crowd) * 7;
    if (city.practical.terrain > practical.walking) practicalFit -= (city.practical.terrain - practical.walking) * 10;
    if (city.practical.budget > practical.budget) practicalFit -= (city.practical.budget - practical.budget) * 8;
    if (practical.climate !== "any" && city.practical.climate !== practical.climate) practicalFit -= 7;
    practicalFit = Math.max(35, practicalFit);
    const exactScore = Math.min(96, Math.max(58, affinity * .75 + practicalFit * .25));
    return { city, score: Math.round(exactScore), exactScore, practicalFit };
  }).sort((a, b) => b.exactScore - a.exactScore || b.practicalFit - a.practicalFit || a.city.id.localeCompare(b.city.id));
}

let seed = 20260825;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const runs = 120000;
const winners = Object.fromEntries(CITY_DATA.map((city) => [city.name, 0]));
for (let run = 0; run < runs; run += 1) {
  const answers = QUESTIONS.map((question) => Math.floor(random() * question.options.length));
  winners[rank(answers)[0].city.name] += 1;
}

const malformed = CITY_DATA.filter((city) =>
  !city.id || !city.name || !city.archetype || !city.tagline || !city.reality ||
  city.reasons.length !== 3 || city.route3.length !== 3 || city.route7.length !== 7 ||
  city.route3.some((day) => day.length !== 4) || city.route7.some((day) => day.length !== 4) ||
  city.foods.length < 4 || city.sights.length < 3 || city.sights.some((sight) => sight.length !== 2) ||
  axes.some((axis) => city.vector[axis] === undefined)
);
const duplicateIds = CITY_DATA.map((city) => city.id).filter((id, index, all) => all.indexOf(id) !== index);
const duplicateNames = CITY_DATA.map((city) => city.name).filter((name, index, all) => all.indexOf(name) !== index);
const distribution = Object.entries(winners).sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  questions: QUESTIONS.length,
  cities: CITY_DATA.length,
  routeDays: CITY_DATA.reduce((total, city) => total + city.route3.length + city.route7.length, 0),
  malformed: malformed.map((city) => city.name),
  duplicateIds,
  duplicateNames,
  reachedFirstPlace: distribution.filter(([, count]) => count > 0).length,
  distribution: distribution.map(([city, count]) => ({ city, count, rate: Number((count / runs * 100).toFixed(2)) }))
}, null, 2));
