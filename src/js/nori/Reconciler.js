import {compose} from "ramda";
import Is from "./util/is";
import {getNextId} from "./util/ElementIDCreator";
import {isTypeFunction, isNoriComponent, isNori} from "./Nori";
import {cloneDeep} from "lodash";
import {performPostRenderHookCleanup} from "./LifecycleQueue";
import {removeEvents} from "./NoriDOM";
import {unregisterHooks} from "./Hooks";

let _componentInstanceMap   = {},
    _currentVnode,
    _currentVnodeHookCursor = 0;

const getKeyOrId                 = vnode => vnode.props.key ? vnode.props.key : vnode.props.id;
const isVDOMNode                 = vnode => typeof vnode === 'object' && vnode.hasOwnProperty('type') && vnode.hasOwnProperty('props') && vnode.hasOwnProperty('children');
const hasOwnerComponent          = vnode => vnode.hasOwnProperty('_owner') && vnode._owner !== null;
const reconcileComponentInstance = vnode => compose(renderComponent, getComponentInstance)(vnode);

export const cloneNode             = vnode => cloneDeep(vnode);
export const getComponentInstances = _ => _componentInstanceMap;
export const getCurrentVnode       = _ => _currentVnode;
export const setCurrentVnode       = vnode => {
  _currentVnodeHookCursor = 0;
  _currentVnode           = vnode;
};
export const getHookCursor         = _ => _currentVnodeHookCursor++;

export const reconcile = vnode => {
  vnode = cloneNode(vnode);
  setCurrentVnode(vnode);
  if (isTypeFunction(vnode)) {
    vnode = reconcileComponentInstance(vnode);
  }
  return reconcileChildren(vnode, reconcile);
};

const reconcileChildren = (vnode, mapper) => {
  if (vnode.hasOwnProperty('children') && vnode.children.length) {
    vnode.children = reconcileChildFunctions(vnode).map(mapper);
  }
  return vnode;
};

export const reconcileOnly = id => vnode => {
  vnode = cloneNode(vnode);
  setCurrentVnode(vnode);
  if (hasOwnerComponent(vnode) && vnode.props.id === id) {
    vnode = reconcileComponentInstance(vnode);
  } else if (hasOwnerComponent(vnode) && vnode._owner.props.id === id) {
    console.log('ReconcileOnly SFC?', vnode);
    vnode = reconcileComponentInstance(vnode._owner);
  } else if (isTypeFunction(vnode)) {
    vnode = reconcile(vnode);
  }
  return reconcileChildren(vnode, reconcileOnly(id));
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const reconcileChildFunctions = vnode => {
  let children    = vnode.children,
      result      = [],
      resultIndex = [],
      index       = 0;

  // if(vnode.props.hasOwnProperty('id')) {
  //   console.log('reconcile',vnode.props.id);
  // }
  children = children.map((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();
      childResult     = childResult.map((c, i) => {
        if (isTypeFunction(c)) {
          c = reconcile(c);
        } else if (typeof c === 'object' && !getKeyOrId(c)) {
          // TODO Take in to account keys?
          c.props.id = c.props.id ? c.props.id : vnode.props.id + `.${i}.${index++}`;
        }
        return c;
      });
      result.unshift(childResult);
      resultIndex.unshift(i);
    } else if (typeof child.type === 'object') {
      // Occurs when a fn that returns JSX is used as a component in a component
      child = child.type;
    } else {
      child = reconcile(child);
    }
    return child;
  });
  resultIndex.forEach((idx, i) => {
    children.splice(idx, 1, ...result[i]);
  });
  return children;
};

// SFCs will pass to renderComponent
const getComponentInstance = vnode => {
  let id = getKeyOrId(vnode);
  if (_componentInstanceMap.hasOwnProperty(id)) {
    vnode = _componentInstanceMap[id];
  } else if (isNoriComponent(vnode)) {
    vnode = createNoriComponentInstance(vnode);
  }
  return vnode;
};

const createNoriComponentInstance = vnode => {
  vnode.props.children      = Is.array(vnode.children) ? vnode.children : [vnode.children];
  let instance              = new vnode.type(vnode.props);
  let id                        = instance.props.id; // id could change during construction
  _componentInstanceMap[id] = instance;
  return instance;
};

/*
To do
- Memoize result and return if props or state are the same?
- SFC tell if state or props changed?
 */
const renderComponent = instance => {
  if (typeof instance.internalRender === 'function') {
    let vnode    = instance.internalRender();
    vnode._owner = instance;
    return vnode;
  } else if (isTypeFunction(instance)) {
    return renderSFC(instance);
  } else if (hasOwnerComponent(instance)) {
    if (isNori(instance._owner)) {
      return renderComponent(instance._owner);
    }
    return renderSFC(instance._owner);
  } else if (isVDOMNode(instance)) {
    if (!instance.props.id) {
      instance.props.id = instance.props.key ? '' + instance.props.key : getNextId();
    }
    return instance;
  }
  return null;
};

const renderSFC = instance => {
  if (instance && typeof instance === 'object' && !instance.hasOwnProperty('type')) {
    console.warn(`renderSFC : This isn't a SFC!`, instance);
    return instance;
  }
  let vnode = instance.type(instance.props);
  if (!vnode.props.id) {
    vnode.props.id = instance.props.key ? '' + instance.props.key : instance.props.id;
  }
  vnode._owner = instance;
  return vnode;
};

// NoriDOM update() on when an element isn't in the new vdom tree
export const removeComponentInstance = vnode => {
  const id = getKeyOrId(vnode);

  performPostRenderHookCleanup(id);
  unregisterHooks(id);
  removeEvents(id);

  // Components
  if (_componentInstanceMap.hasOwnProperty(id)) {
    const compInst = _componentInstanceMap[id];
    if (typeof compInst.componentWillUnmount === 'function') {
      compInst.componentWillUnmount();
      compInst.remove();
    }
    delete _componentInstanceMap[id];
  }
};