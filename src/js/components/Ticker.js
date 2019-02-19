/* @jsx h */

/**
 * Example component that supports lifecycle hooks and state updating
 */

import DOMComponent from '../nori/DOMComponent';
import {h} from "../nori/Nori";
import {css} from 'emotion';

const red = css`color: red;`;

export default class Ticker extends DOMComponent {

  // Default state
  internalState = {counter: 0};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
  }

  componentDidMount = () => {
    //console.log('Ticker rendered!');
    //setInterval(_ => {this.state = {counter: ++this.state.counter}}, 1000)
  };

  componentDidUpdate = () => {
    //console.log('Ticker update', this.state);
  };

  componentWillUnmount = () => {
    //console.log('Ticker will umount');
  };

  render() {
    return <h3>The count is <strong className={red}>{this.internalState.counter}</strong> ticks.</h3>;
  }
}