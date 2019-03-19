
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

import {equals} from 'ramda';
import {getCurrentVnode, getHookCursor} from "./Reconciler";
import {enqueueUpdate, isSteady} from "./Nori";
import {enqueuePostRenderHook} from "./LifecycleQueue";

let _hooksMap = {};

// Returns true if first call, false if n+ call
const registerHook = (type, value) => {
  // Make sure hooks are only used during rendering
  if(isSteady()) {
    console.warn('Hooks can only be called inside the body of a function component!');
    return;
  }

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
  }
  return {initial, id, cursor, hook: _hooksMap[id][cursor]};
};

const updateHookData = (id, cursor, data) => {
  //console.log(`updateHookData : ${id},${cursor} : `,data);
  _hooksMap[id][cursor].data = data;
};

export const unregisterHooks = (id) => {
  if (_hooksMap.hasOwnProperty(id)) {
    delete _hooksMap[id];
  }
};

// HOW to get the component to update when setState is called?
export const useState = initialState => {
  const res = registerHook('useState', initialState);
  const currentState = res.hook.data;
  const setState = newState => {
    if (typeof newState === "function") {
      newState = newState(currentState);
    }
    updateHookData(res.id, res.cursor, newState);
    enqueueUpdate(res.id);
  };
  return [currentState, setState];
};

export const useMemo = (callbackFn, deps) => {
  let res = registerHook('useMemo', {callback: callbackFn,  dependencies: deps, output:null});
  const changedDeps = !equals(deps, res.hook.data.dependencies);
  if(res.initial || deps === undefined || changedDeps) {
    const result = callbackFn();
    updateHookData(res.id, res.cursor, {callback: callbackFn, dependencies: deps, output:result});
    return result;
  }
  return res.hook.data.output;
};

// https://twitter.com/dan_abramov/status/1055709764036943872?lang=en
export const useCallBack = (callbackFn, deps) => {
  return useMemo(callbackFn, deps);
};

export const useEffect = (callbackFn, deps) => {
  let res = registerHook('useEffect', {callback: callbackFn, dependencies: deps});
  const changedDeps = !equals(deps, res.hook.data.dependencies);
  if(deps === undefined || changedDeps) {
    updateHookData(res.id, res.cursor, {callback: callbackFn, dependencies: deps});
    enqueuePostRenderHook(res.id, callbackFn);
  } else if(res.initial || deps.length === 0){
    enqueuePostRenderHook(res.id, callbackFn);
  }
};

// TODO this needs to run right after the component is rendered not after everything renders
export const useLayoutEffect = (callbackFn, deps) => {
  useEffect(callbackFn, deps);
};