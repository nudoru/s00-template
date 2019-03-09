import {compose} from "ramda";
import Is from "./util/is";
import {getNextId} from "./util/ElementIDCreator";
import {isComponentElement, isNoriComponent} from "./Nori";
import {cloneDeep} from "lodash";

let _componentInstanceMap = {},
    _currentVnode,
    _currentVnodeHookCursor = 0;

const getKeyOrId        = vnode => vnode.props.key ? vnode.props.key : vnode.props.id;
const isVDOMNode        = vnode => typeof vnode === 'object' && vnode.hasOwnProperty('type') && vnode.hasOwnProperty('props') && vnode.hasOwnProperty('children');
const hasOwnerComponent = vnode => vnode.hasOwnProperty('_owner') && vnode._owner !== null;
const reconcileComponentInstance = vnode => compose(renderComponent, getComponentInstance)(vnode);

export const cloneNode         = vnode => cloneDeep(vnode); // Warning: Potentially expensive
export const getComponentInstances = _ => _componentInstanceMap;
export const getCurrentVnode    = _ => _currentVnode;
export const setCurrentVnode    = vnode => {
  _currentVnodeHookCursor = 0;
  _currentVnode           = vnode;
};
export const getHookCursor = _ => _currentVnodeHookCursor++;


const reconcileChildren = (vnode, mapper) => {
  if (vnode.hasOwnProperty('children')) {
    vnode.children = reconcileComponent(vnode).map(mapper);
  }
  return vnode;
};

export const reconcile = vnode => {
  vnode = cloneNode(vnode);
  setCurrentVnode(vnode);
  if (isComponentElement(vnode)) {
    vnode = reconcileComponentInstance(vnode);
  }
  return reconcileChildren(vnode, reconcile);
};

export const reconcileOnly = id => vnode => {
  vnode = cloneNode(vnode);
  setCurrentVnode(vnode);
  if (hasOwnerComponent(vnode) && vnode.props.id === id) {
    vnode = reconcileComponentInstance(vnode);
  } else if (isComponentElement(vnode)) {
    vnode = reconcile(vnode);
  }
  return reconcileChildren(vnode, reconcileOnly(id));
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const reconcileComponent = vnode => {
  let children    = vnode.children,
      result      = [],
      resultIndex = [],
      index       = 0;

  children = children.map((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();
      childResult     = childResult.map((c, i) => {
        if (typeof c.type === 'function') {
          c = reconcile(c);
        } else if (typeof c === 'object' && !getKeyOrId(c)) { //c.props.id
          c.props.id = c.props.id ? c.props.id : vnode.props.id + `.${i}.${index++}`;
        }
        return c;
      });
      result.unshift(childResult);
      resultIndex.unshift(i);
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

const getComponentInstance = vnode => {
  let instance = vnode,
      id       = getKeyOrId(vnode);
  if (_componentInstanceMap.hasOwnProperty(id)) {
    instance = _componentInstanceMap[id];
  } else if (typeof vnode.type === 'function') {
    vnode.props.children = Is.array(vnode.children) ? vnode.children : [vnode.children];
    instance             = new vnode.type(vnode.props);
    if (isNoriComponent(vnode)) {
      // Only cache NoriComps, not SFCs
      id                        = instance.props.id; // id could change during construction
      _componentInstanceMap[id] = instance;
    }
  } else if (vnode.hasOwnProperty('_owner')) {
    instance                  = vnode._owner;
    id                        = instance.props.id;
    _componentInstanceMap[id] = instance;
  } else {
    console.warn(`instantiateNewComponent : vnode is not component type`, typeof vnode.type, vnode);
  }
  return instance;
};

const renderComponent = instance => {
  if (typeof instance.internalRender === 'function') {
    // Set currently rendering for hook
    // setCurrentVnode(instance);
    let vnode    = instance.internalRender();
    vnode._owner = instance;
    // setCurrentVnode(null);
    return vnode;
  } else if (isVDOMNode(instance)) {
    if (!instance.props.id) {
      instance.props.id = instance.props.key ? '' + instance.props.key : getNextId();
    }
    return instance;
  }
  return null;
};

// Called from NoriDOM when an element isn't in the new vdom tree
export const removeComponentInstance = vnode => {
  if (hasOwnerComponent(vnode)) {
    if (typeof vnode._owner.componentWillUnmount === 'function') {
      vnode._owner.componentWillUnmount();
      vnode._owner.remove();
    }
    delete _componentInstanceMap[vnode._owner.props.id];
  }
};