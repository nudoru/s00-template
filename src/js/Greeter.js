import Component from './nori/Component';

/*
How to scope THIS?
 */


export default class Greeter extends Component {
  constructor(props={}, children=[]) {
    //{attrs:{click: this._onClick}
    super('h1', {}, ['Hello, <em>{{name}}!</em>']);
    this.internalState = {name: 'Matt'};
  }

  _onClick = e => console.log('greeter click!');

  renderTo(el) {
    super.renderTo(el);
  }
}