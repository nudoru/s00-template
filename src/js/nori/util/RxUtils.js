/**
 * RxJS Helpers
 * @type {{dom: Function, from: Function, interval: Function, doEvery: Function, just: Function, empty: Function}}
 */

import * as Rxjs from 'rxjs';
import Is from './is.js';

export const dom = (selector, event) => {
  let el = selector;

  if (Is.string(selector)) {
    el = document.querySelector(selector);
  }

  if (!el) {
    console.warn('nori/utils/Rx, dom, invalid DOM selector: ' + selector);
    return;
  }
  return Rxjs.Observable.fromEvent(el, event.trim());
};

export const doEvery = (ms, ...args) => {
  if (Is.func(args[0])) {
    return interval(ms).subscribe(args[0]);
  }
  return interval(ms).take(args[0]).subscribe(args[1]);
};

export const ittr = (ittr) => {
  return Rxjs.Observable.from(ittr);
};

export const interval = (ms) => {
  return Rxjs.Observable.interval(ms);
};

export const just = (value) => {
  return Rxjs.Observable.just(value);
};

export const empty = () => {
  return Rxjs.Observable.empty();
};