/**
 * Simple wrapper component. I'll extend this with more functionality later
 */

import DOMComponent from '../nori/DOMComponent';

export default class Box extends DOMComponent {

  constructor(props, children) {
    const baseElement = props.element || 'div';
    super(baseElement, props, children);
  }
}