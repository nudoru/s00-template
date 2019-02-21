/* @jsx h */

/**
 * Example component that supports lifecycle hooks and state updating
 */

import NoriComponent from '../nori/NoriComponent';
import {h} from "../nori/Nori";
import {css} from 'emotion';

const red = css`color: red;`;

export default class Ticker extends NoriComponent {

  // Default state
  internalState = {counter: 1};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
    this.tickerID = null;
  }

  componentDidMount = () => {
    this.tickerID = setInterval(this.$updateTicker, 1000)
  };

  $updateTicker = _ => {
    //console.log('Ticker update!', this.props.id, this.current);
    this.state = {counter: ++this.state.counter}
  };

  componentDidUpdate = () => {
    //console.log('Ticker update', this.state);
  };

  componentWillUnmount = () => {
    clearInterval(this.tickerID);
  };

  render() {
    return <h3>The count is <strong className={red}>{this.internalState.counter}</strong> ticks.</h3>;
  }
}