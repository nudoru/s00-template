/**
 * Example component that returns some dummy text for mockups and testing
 */

import * as L from '../nori/util/Lorem';
import Component from '../nori/Component';

export default class Lorem extends Component {

  TEXT = 'text';

  constructor(props, children = []) {
    const baseElement = props.element || 'span';
    super(baseElement, props, []);
  }

  render() {
    const min = this.props.min || 1;
    const max = this.props.max || 2;
    const mode = this.props.mode || 'text';

    let lorem = L.text(min, max);

    switch (mode) {
      case 'paragraph':
        lorem = L.paragraph(min, max);
        break;
      case 'title':
        lorem = L.title(min, max);
        break;
      case 'sentence':
        lorem = L.sentence(min, max);
        break;
      case 'date':
        lorem = L.date().string;
        break;
      case 'fullNameFL':
        lorem = L.firstLastName();
        break;
    }

    // Return an array or each letter will be created as an individual element
    return [lorem];
  }

}

Lorem.TEXT = 'text';
Lorem.PARAGRAPH = 'paragraph';
Lorem.TITLE = 'title';
Lorem.SENTENCE = 'sentence';
Lorem.DATE = 'date';
Lorem.FULLNAMEFL= 'fullNameFL';