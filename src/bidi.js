import { RTL_NON_LETTERS } from './rtl-chars.js';

const RTL_LETTERS = /[֐-ࣿיִ-﷿ﹰ-﻿]/u;

/**
 * Direction of the first strong character: 'rtl', 'ltr', or 'none' when there is none.
 * Letters in the Arabic/Hebrew ranges and strong RTL symbols are rtl, any other letter is ltr.
 * Digits (including Arabic-Indic) and punctuation are neutral.
 */
export function firstStrong(text) {
  for (const ch of text) {
    if (RTL_NON_LETTERS.test(ch)) return 'rtl';
    if (!/\p{L}/u.test(ch)) continue;
    return RTL_LETTERS.test(ch) ? 'rtl' : 'ltr';
  }
  return 'none';
}
