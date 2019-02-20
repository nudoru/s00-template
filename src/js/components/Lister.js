/* @jsx h */

/**
 * Example component that supports lifecycle hooks and state updating
 */

import DOMComponent from '../nori/DOMComponent';
import {h} from "../nori/Nori";
import {css} from 'emotion';
import {modularScale} from "../theme/Theme";
import {range} from "../nori/util/ArrayUtils";
import Ticker from './Ticker';
import Greeter from './Greeter';

const bordered = css`
border: 1px solid #ccc;
background-color: #eee;
padding: ${modularScale.ms0}
`;

export default class Lister extends DOMComponent {

  // Default state
  internalState = {counter: 1};
  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
  }

  componentDidMount = () => {
    //console.log('Ticker did mount');
  };

  componentDidUpdate = () => {
    // console.log('Lister update', this.state);
  };

  componentWillUnmount = () => {
    //console.log('Lister will unmount');
  };

  $onAddClick = e => {
    this.state = {counter: ++this.state.counter}
  };

  $onRemoveClick = e => {
    let current = this.state.counter;
    if(current < 2) {
      return;
    }
    this.state = {counter: --current}
  };

// <ul>
// {range(this.state.counter).map(i => <li>Item {i+1}</li>)}
// </ul>

  render() {
    //console.log('render lister');
    return <div className={bordered} key={this.props.id}>
      <button click={this.$onAddClick}>Add</button><button click={this.$onRemoveClick}>Remove</button>
      <hr/>
      {range(this.state.counter).map(i => {
        return <Ticker key={'listitem-'+i}/>;
      })}

    </div>;
  }
}