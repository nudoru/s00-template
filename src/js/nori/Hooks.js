
/* Let's play with hooks!
https://reactjs.org/docs/hooks-reference.html
React's Rules:
  1. must be called at in the redner fn
  2. called in the same order - not in a conditional
  3. No loops

  Some hooks are called as soon as they are encountered like useState
  Some are called AFTER the element has mounted like useEffect
    - need to add a the cDM queue in lifecycle

*/

import {getCurrentVnode, getHookCursor} from "./Reconciler";
import {enqueueUpdate} from "./Nori";

let _hooksMap = {};

// Returns true if first call, false if n+ call
const registerHook = (type, value) => {
  let initial = false,
      cVnode = getCurrentVnode(),
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
    initial = true;
    _hooksMap[id].push({type, vnode: cVnode, data: value});
    //console.log(`NEW hook ${type} for ${id} at ${cursor}`, value);
  } else {
    const runHook = _hooksMap[id][cursor];
    //console.log(`RUN hook ${type} for ${id}`, runHook);
    switch (runHook.type) {
      case 'useState':
        //console.log(`   useState: `, runHook.data);
        break;
      case 'useEffect':
        console.log(`   useEffect: `, runHook.data);
        break;
      default:
        console.warn(`unknown hook type: ${runHook.type}`)
    }
  }
  return {initial, id, cursor, hook: _hooksMap[id][cursor]};
};

const updateHookData = (id, cursor, data) => {
  //console.log(`updateHookData : ${id},${cursor} : `,data);
  _hooksMap[id][cursor].data = data;
  enqueueUpdate(id);
};

// TODO when the component is removed need to unregister
const unregisterHook = (vnode, type) => {
  console.log(`unregisterHook for `, vnode, type);
};


// HOW to get the component to update when setState is called?
export const useState = initialState => {
  const res = registerHook('useState', initialState);
  const currentState = res.hook.data;
  //console.log('useState : ',res);

  const setState = newState => {
    if (typeof newState === "function") {
      newState = newState(currentState);
    }
    updateHookData(res.id, res.cursor, newState);
  };

  return [currentState, setState];
};

// This needs to run on cDM and cDU
//https://twitter.com/swyx/status/1100833207451185152
export const useEffect = (callbackFn, deps=[]) => {
  registerHook('useEffect', callbackFn);
};