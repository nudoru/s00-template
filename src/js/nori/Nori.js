import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {setProps, updateProps} from "./DOMing";
import {setEvents} from "./Eventing";
import {getNextId} from "./util/ElementIDCreator";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

let lastHostTree,
    $hostNode,
    componentInstanceMap = {},
    didMountQueue        = [];

// Convenience method to create new components. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  props.id = props.key || getNextId();

  return {
    type, props, children: args.length ? flatten(args) : [], forceUpdate: false
  };
};


const createElement = node => {
  let $el;
  if (typeof node === 'string' || typeof node === 'number') {
    // Plain value of a tag
    $el = document.createTextNode(node);
  } else if (typeof node.type === 'function') {
    let instance,
        existingInstance = false;

    // If the instance has been flagged as updated (new prop on the map entry) rerender?
    if (componentInstanceMap.hasOwnProperty(node.props.id)) {
      instance         = componentInstanceMap[node.props.id];
      existingInstance = true;
    } else {
      instance                            = new node.type(node.props, node.children);
      componentInstanceMap[node.props.id] = instance;
    }

    if (typeof instance.render === 'function') {
      // Component
      // TODO set a reference in the component to the DOM node created here
      $el              = createElement(instance.render());
      instance.current = $el;
    } else {
      // Stateless functional component
      $el = createElement(instance);
    }

    if (typeof instance.componentDidMount === 'function' && !existingInstance) {
      didMountQueue.push(instance.componentDidMount.bind(instance));
    }
  } else if (typeof node === 'object' && typeof node.type === 'string') {
    // Normal tag
    $el = document.createElement(node.type);
    node.children
      .map(createElement)
      .forEach($el.appendChild.bind($el));
  } else {
    console.warn(`Unknown node type ${node} : ${node.type}`);
  }

  setProps($el, node.props || {});
  setEvents(node.props, $el);

  return $el;
};

const changed = (newNode, oldNode) => {
  if(newNode.forceUpdate) {
    return true;
  }
  return typeof newNode !== typeof oldNode ||
    typeof newNode === 'string' && newNode !== oldNode ||
    newNode.type !== oldNode.type
};

// TODO need to call willUpdate and didUpdate
const updateElement = ($hostNode, newNode, oldNode, index = 0) => {

  if (!oldNode) {
    $hostNode.appendChild(
      createElement(newNode)
    );
  } else if (!newNode) {
    // TODO need to remove events
    $hostNode.removeChild(
      $hostNode.childNodes[index]
    );
  } else if (changed(newNode, oldNode)) {
    $hostNode.replaceChild(
      createElement(newNode),
      $hostNode.childNodes[index]
    );
  } else if (newNode.type) {
    updateProps(
      $hostNode.childNodes[index],
      newNode.props,
      oldNode.props
    );
    const newLength = newNode.children.length;
    const oldLength = oldNode.children.length;

    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateElement(
        $hostNode.childNodes[index],
        newNode.children[i],
        oldNode.children[i],
        i
      );
    }
  }
}

// Render a component to a dom node
export const render = (component, hostNode, removeExisting = true) => {
  if (removeExisting) {
    removeAllElements(hostNode);
  }

  lastHostTree = component;
  $hostNode    = hostNode;

  updateElement(hostNode, component);
  // hostNode.appendChild(createElement(component));

  didMountQueue.forEach(fn => fn());
  didMountQueue = [];
};

// TODO Store updates and do all at once on an interval? 1ms?
export const enqueueUpdate = (id) => {
  // console.log(`component update on ${id}`);
  let newHostTree = markForceUpdateVDOMInTree(lastHostTree, id);
  updateElement($hostNode, newHostTree, lastHostTree);
  clearForceUpdateVDOMInTree(newHostTree);
  lastHostTree = newHostTree;
};

const markForceUpdateVDOMInTree = (vdom, id) => {
  if(typeof vdom === 'object') {
    if(vdom.props.id === id) {
      vdom.forceUpdate = true;
    } else if(vdom.props.children){
      vdom.props.children.forEach(child => markForceUpdateVDOMInTree(child, id));
    }
  }
  return vdom;
};

const clearForceUpdateVDOMInTree = (vdom) => {
  if(typeof vdom === 'object') {
    if(vdom.props.children){
      vdom.forceUpdate = false;
      vdom.props.children.forEach(child => clearForceUpdateVDOMInTree(child));
    }
  }
  return vdom;
};