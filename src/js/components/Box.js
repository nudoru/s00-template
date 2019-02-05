import Component from '../nori/Component';


export default class Box extends Component {

  constructor(props, children) {
    const baseElement = props.element || 'div';
    super(baseElement, props, children);
  }
}