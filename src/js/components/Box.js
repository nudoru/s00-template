/**
 * Simple wrapper component. I'll extend this with more functionality later
 */

import Component from '../nori/Component';

export default class Box extends Component {

  constructor(props, children) {
    const baseElement = props.element || 'div';
    super(baseElement, props, children);
  }
}