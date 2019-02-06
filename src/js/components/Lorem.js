import * as L from '../nori/util/Lorem';
import Component from '../nori/Component';

/*
TODO
  - children - where would this be useful?
 */

/*
Props
  min / max
  mode - paragraph || text || title || sentence ||  date || fullNameFL
 */

export default class Lorem extends Component {

  TEXT = 'text';

  constructor(props, children = []) {
    const baseElement = props.element || 'span';
    const min = props.min || 1;
    const max = props.max || 2;
    const mode = props.mode || 'text';

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
    super(baseElement, props, lorem);
  }
}

Lorem.TEXT = 'text';
Lorem.PARAGRAPH = 'paragraph';
Lorem.TITLE = 'title';
Lorem.SENTENCE = 'sentence';
Lorem.DATE = 'date';
Lorem.FULLNAMEFL= 'fullNameFL';