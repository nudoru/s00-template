import Component from './nori/Component';

import {useState} from "./nori/C";

/*
Testing stuff for Greeter ...

const _onGreetClick = evt => {
    //console.log('greet!',evt);
    evt.component.state = {name:Lorem.firstLastName()};
  };

  const _onGreetRender = evt => {
    //console.log('greet rendered!', evt);
  };

  const _onGreetUpdate = evt => {
    //console.log('greet update!', evt.component.state);
  };

  // let test = <p class={blue}>Hi, <Greeter triggers={{
  //   click: _onGreetClick,
  //   render: _onGreetRender,
  //   update: _onGreetUpdate,
  // }}>There</Greeter></p>;

 */

export default class Greeter extends Component {

  // Default state
  internalState = {name: 'Matt'};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    // call super and pass what's needed
    let [greeting, setGreet] = useState('Hello, <em>{{name}}!</em>');
    super('h1', props, [greeting]);
  }

  // Override fn's
}