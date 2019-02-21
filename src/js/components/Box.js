/* @jsx h */

/**
 * Simple wrapper component. I'll extend this with more functionality later
 */

import {h} from "../nori/Nori";
import NoriComponent from '../nori/NoriComponent';

export default class Box extends NoriComponent {

  constructor(props, children) {
    super('div', props, children);
  }

  render() {
    let {children, ...rest} = this.props;
    return <div {...rest}>{children}</div>;
  }
}