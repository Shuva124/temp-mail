import { customAlphabet } from "nanoid";

const nouns = [
  'fox', 'wolf', 'hawk', 'bear', 'lynx', 'crow', 'deer', 'frog', 'kite',
  'mole', 'pike', 'wren', 'ibis', 'orca', 'puma', 'newt', 'toad', 'vole',
  'weasel', 'quail', 'finch', 'crane', 'raven', 'lark', 'robin', 'snipe',
];

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateAddress() {
  const shuffled = shuffleArray(nouns);

  const word1 = shuffled[0];
  const word2 = shuffled[1];

  const id = nanoid();

  return `${word1}${word2}${id}@mg.neesiuu.xyz`;
}

export default generateAddress;