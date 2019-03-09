/*
TODO
  - HOOKS
    - move hooks to new files
    - how to separate currentVnode cursor
    - use hooks outside of render?
    - use hooks in SFC?
  - update lister with my usestate as a test
  - test render props pattern https://www.robinwieruch.de/react-render-props-pattern/
  - use this list to preinit common tags? https://www.npmjs.com/package/html-tags
    - ex: https://github.com/alex-milanov/vdom-prototype/blob/master/src/js/util/vdom.js#L190
    - // Super slick ES6 one liner factory function!
      const greetingFactory = (name) => Reflect.construct(Greeting, [name]);
  - throw errors and error boundaries
  - update props
  - memo components
  - pure components - no update if state didn't change
  - context?
  - refs?
  - spinner https://github.com/davidhu2000/react-spinners/blob/master/src/BarLoader.jsx
  - create a fn that will determine if the vnode has been rendered and call render or update as appropriate
  - test form input
  - Element or wrapper for text nodes?
  - use ImmutableJS data structures
  - test fn as prop value
  - test my mouse renderprops
  - in component constructor, call super w/ only props
  - Memoize? https://blog.javascripting.com/2016/10/05/building-your-own-react-clone-in-five-easy-steps/
 */

import {flatten} from "./util/ArrayUtils";
import {
  enqueueDidUpdate,
  getDidUpdateQueue,
  performDidMountQueue,
  performDidUpdateQueue
} from './LifecycleQueue';
import {patch} from './NoriDOM';
import NoriComponent from "./NoriComponent";
import {
  reconcile,
  reconcileOnly,
  getComponentInstances,
  cloneNode
} from "./Reconciler";

const STAGE_UNITIALIZED = 'uninitialized';
const STAGE_RENDERING   = 'rendering';
const STAGE_UPDATING    = 'updating';
const STAGE_STEADY      = 'steady';

const UPDATE_TIMEOUT = 10;  // how ofter the update queue runs

let _currentVDOM,
    _currentVnode,
    _updateTimeOutID,
    _currentStage = STAGE_UNITIALIZED;

export const isNoriElement      = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.element';
export const isNoriComponent    = vnode => Object.getPrototypeOf(vnode.type) === NoriComponent;
export const isComponentElement = vnode => typeof vnode === 'object' && typeof vnode.type === 'function';
export const setCurrentVDOM     = tree => _currentVDOM = tree;
export const getCurrentVDOM     = _ => cloneNode(_currentVDOM);
export const isInitialized      = _ => _currentStage !== STAGE_UNITIALIZED;
export const isRendering        = _ => _currentStage === STAGE_RENDERING;
export const isUpdating         = _ => _currentStage === STAGE_UPDATING;
export const isSteady           = _ => _currentStage === STAGE_STEADY;
export const getCurrentVnode    = _ => _currentVnode;
export const setCurrentVnode    = vnode => {
  _currentVnodeHookCursor = 0;
  _currentVnode           = vnode;
};

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => ({
  type,
  props   : props || {},
  children: args.length ? flatten(args) : [],
  _owner  : null, // will be the NoriComponent instance that generated the node
  $$typeof: Symbol.for('nori.element')
});

// Called from NoriDOM to render the first vdom
export const renderVDOM = node => {
  _currentStage = STAGE_RENDERING;
  const vdom    = reconcile(node);
  setCurrentVDOM(vdom);
  _currentStage = STAGE_STEADY;
  return vdom;
};


//------------------------------------------------------------------------------
//STATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATES
//------------------------------------------------------------------------------

// Queue updates from components and batch update every so often
// Called from NoriComponent set state
export const enqueueUpdate = id => {
  enqueueDidUpdate(id);
  if (!_updateTimeOutID) {
    _updateTimeOutID = setTimeout(performUpdates, UPDATE_TIMEOUT);
  }
};

const performUpdates = () => {
  if (isRendering()) {
    console.log(`>>> Update called while rendering`);
    return;
  }
  // console.time('update');
  clearTimeout(_updateTimeOutID);
  _updateTimeOutID      = null;
  _currentStage         = STAGE_RENDERING;
  // TODO put in a box and map
  const updatedVDOMTree = getDidUpdateQueue().reduce((acc, id) => {
    acc = reconcileOnly(id)(acc);
    return acc;
  }, getCurrentVDOM());
  patch(getCurrentVDOM())(updatedVDOMTree);
  setCurrentVDOM(updatedVDOMTree);
  performDidMountQueue();
  _currentStage = STAGE_UPDATING;
  performDidUpdateQueue(getComponentInstances());
  _currentStage = STAGE_STEADY;
  // console.timeEnd('update');
};


/* Let's play with _hooksMap!
https://reactjs.org/docs/_hooksMap-reference.html
React's Rules:
  1. must be called at in the redner fn
  2. called in the same order - not in a conditional
  3. No loops
*/

let _hooksMap = {},
    _currentVnodeHookCursor;

const registerHook = (type, ...args) => {
  let cVnode = getCurrentVnode();
  if (!cVnode) {
    console.warn(`registerHook : Can't register hook, no current vnode!`);
    return;
  }
  const id = cVnode.props.id;

  if (!_hooksMap.hasOwnProperty(id)) {
    _hooksMap[id] = [];
  }
  if (!_hooksMap[id][_currentVnodeHookCursor]) {
    _hooksMap[id].push({type, vnode: cVnode, data: args});
    //console.log(`NEW hook ${type} for ${id} at ${_currentVnodeHookCursor}`, args);
  } else {
    const runHook = _hooksMap[id][_currentVnodeHookCursor];
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
  _currentVnodeHookCursor++;
};

const unregisterHook = (vnode, type) => {
  console.log(`unregisterHook for `, vnode, type);
};

const performHook = vnode => {
  console.log(`performHook for `, vnode);
};

export const useState = (initialState) => {
  //registerHook('useState', initialState);
};

export const useEffect = (didUpdateFn) => {
  //registerHook('useEffect', didUpdateFn);
};