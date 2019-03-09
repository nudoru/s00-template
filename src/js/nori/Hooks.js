
/* Let's play with _hooksMap!
https://reactjs.org/docs/_hooksMap-reference.html
React's Rules:
  1. must be called at in the redner fn
  2. called in the same order - not in a conditional
  3. No loops
*/

import {getCurrentVnode, getHookCursor} from "./Reconciler";

let _hooksMap = {};

const registerHook = (type, ...args) => {
  let cVnode = getCurrentVnode(),
      cursor = getHookCursor();

  if (!cVnode) {
    console.warn(`registerHook : Can't register hook, no current vnode!`);
    return;
  }
  const id = cVnode.props.id;

  if (!_hooksMap.hasOwnProperty(id)) {
    _hooksMap[id] = [];
  }
  if (!_hooksMap[id][cursor]) {
    _hooksMap[id].push({type, vnode: cVnode, data: args});
    console.log(`NEW hook ${type} for ${id} at ${cursor}`, args);
  } else {
    const runHook = _hooksMap[id][cursor];
    console.log(`RUN hook ${type} for ${id}`, runHook);
    switch (runHook.type) {
      case 'useState':
        console.log(`useState: `, runHook.data);
        break;
      case 'useEffect':
        console.log(`useEffect: `, runHook.data);
        break;
      default:
        console.warn(`unknown hook type: ${runHook.type}`)
    }
  }
  cursor++;
};

const unregisterHook = (vnode, type) => {
  console.log(`unregisterHook for `, vnode, type);
};

const performHook = vnode => {
  console.log(`performHook for `, vnode);
};

export const useState = (initialState) => {
  registerHook('useState', initialState);
};

export const useEffect = (didUpdateFn) => {
  registerHook('useEffect', didUpdateFn);
};