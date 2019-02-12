/* @jsx h */

import Component from '../nori/Component';
import {h} from "../nori/C";
import * as L from '../nori/util/Lorem';

export default class Greeter extends Component {

  // Default state
  internalState = {name: L.firstLastName()};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    super('h1', props, []);
  }

  $onClick = evt => {
    console.log('Greet click!',evt);
    this.state = {name:L.firstLastName()};
  };

  $onRender = evt => {
    console.log('Greet rendered!', evt);
  };

  willRemove = () => {
    console.log('Greet will remove');
  };
  didDelete = () => {
    console.log('Greet did delete');
  };
  willUpdate = () => {
    console.log('Greet will update');
  };
  didUpdate = () => {
    console.log('Greet did update');
  };

  render() {
    return <h1 triggers={{
      click: this.$onClick,
      render: this.$onRender
    }}>Hello, <em>{this.internalState.name}</em></h1>;
  }
}