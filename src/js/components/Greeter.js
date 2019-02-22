/* @jsx h */

/**
 * Example component that supports action triggers, lifecycle hooks and state updating
 */

import NoriComponent from '../nori/NoriComponent';
import {h} from "../nori/Nori";
import * as L from '../nori/util/Lorem';
import {css} from 'emotion';

const blue = css`color: blue;`;

export default class Greeter extends NoriComponent {

  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
    this.state = {name: L.firstLastName()};
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
    return <h1 onClick={this.$onClick} onMouseOver={this.onOver} onMouseOut={this.onOut}>Hello, <em className={blue}>{this.state.name}</em></h1>;
  }
}