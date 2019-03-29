import NoriComponent from './NoriComponent';

/*
Clear provider when out of loop (add index counter to reconcile and use that # to test?)
For nested providers, merge state w/ object assign?
For value change, ittr over consumer array and add id's to enqueue update
 */

//https://reactjs.org/docs/context.html

/*
The defaultValue argument is only used when a component does not have a matching Provider above it in the tree. This can be helpful for testing components in isolation without wrapping them. Note: passing undefined as a Provider value does not cause consuming components to use defaultValue.
 */
export const createContext = defaultValue => {

  const context = {
    defaultValue,
    Provider: Provider,
    Consumer: Consumer
  };

  return context;
};

/*
Accepts a value prop to be passed to consuming components that are descendants of this Provider. One Provider can be connected to many consumers. Providers can be nested to override values deeper within the tree.

All consumers that are descendants of a Provider will re-render whenever the Provider’s value prop changes. The propagation from Provider to its descendant consumers is not subject to the shouldComponentUpdate method, so the consumer is updated even when an ancestor component bails out of the update.
 */
export class Provider extends NoriComponent {
  constructor(props) {
    super(props);
    this._value     = props.value || {};
    this._consumers = [];
  };

  get value() {
    return this._value;
  }

  // When this is set, all consumers need to be rerendered
  // compare using Object.is
  set value(newValue) {
    this._value = newValue;
  }

  addConsumer = c => {
    this._consumers.push(c);
  }

}

export class Consumer extends NoriComponent {
  constructor(props) {
    super(props);
  };
}