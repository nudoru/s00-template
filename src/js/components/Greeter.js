/* @jsx h */

/**
 * Example component that supports action triggers, lifecycle hooks and state updating
 */

import DOMComponent from '../nori/DOMComponent';
import {h} from "../nori/Nori";
import * as L from '../nori/util/Lorem';
import {css} from 'emotion';

const blue = css`color: blue;`;

export default class Greeter extends DOMComponent {

  // Default state
  internalState = {name: L.firstLastName()};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
  }

  $onClick = evt => {
    // console.log('Greet click!',evt, this);
    this.state = {name:L.firstLastName()};
  };

  $onRender = evt => {
    //console.log('Greet rendered!', evt);
  };

  componentWillUnmount = () => {
    //console.log('Greet will remove');
  };

  componentWillUpdate  = () => {
    //console.log('Greet will update', this.state.name);
  };

  componentDidUpdate   = () => {
    // console.log('Greet did update');
  };

  onOver = () => {
    console.log('Greeter over');
  };

  onOut = () => {
    console.log('Greeter out');
  };

  render() {
    return <h1 click={this.$onClick} mouseover={this.onOver} mouseout={this.onOut}>Hello, <em className={blue}>{this.state.name}</em></h1>;
  }
}