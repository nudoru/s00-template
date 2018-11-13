import Component from './nori/Component';

export default class Greeter extends Component {

  internalState = {name: 'Matt'};

  // Subclasses should only take passed props and children
  constructor(props, children) {
    // call super and pass what's needed
    super('h1', props, ['Hello, <em>{{name}}!</em>']);
  }
}