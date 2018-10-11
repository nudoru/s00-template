import Component from './nori/Component';

export default class Greeter extends Component {
  constructor() {
    super('h1', {}, ['Hello, <em>{{name}}!</em>']);

    this.internalState = {name: 'Matt'};
  }
}