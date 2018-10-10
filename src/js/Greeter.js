import Component from './nori/Component';

export default class Greeter extends Component {
  constructor() {
    super('h1', {}, ['Hello, {{name}}!']);

    this.internalState = {name: 'Matt'};
  }
}