import Component from '../nori/Component';


export default class Box extends Component {

  // Subclasses should only take passed props and children
  constructor(props, children) {
    // call super and pass what's needed

    console.log('box', props);

    const baseElement = props.element || 'div';

    super(baseElement, props, children);
  }

  // Override fn's
}