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
    this.state = {name:L.firstLastName()};
  };

  $onRender = evt => {
    //console.log('Greet rendered!', evt);
  };

  componentDidMount   = () => {
    // console.log('Greet did mount');
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

  onOver = (e) => {
    //console.log('Greeter over', e, this);
  };

  onOut = () => {
    //console.log('Greeter out');
  };

  render() {
    //console.log(`Greeter ${this.props.id} render with ${this.state.name}`);
    return <h1 onClick={this.$onClick} onMouseOver={this.onOver} onMouseOut={this.onOut}>Hello, <em className={blue}>{this.state.name}</em></h1>;
  }
}