/* @jsx h */

/**
 * Example component that returns some dummy text for mockups and testing
 */

import {h} from "../nori/Nori";
import * as L from '../nori/util/Lorem';
import NoriComponent from '../nori/NoriComponent';

export default class Lorem extends NoriComponent {

  TEXT = 'text';

  // Default state
  internalState = {lorem: 'Lorem ipsum dolor sit amet ...'};

  constructor(props) {
    super(props);

    const min = props.min || 3;
    const max = props.max || 5;
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


    // have to call super first
    this.internalState = {lorem};
  }

  render() {
    // const min = this.props.min || 3;
    // const max = this.props.max || 5;
    // const mode = this.props.mode || 'text';
    //
    // let lorem = L.text(min, max);
    //
    // switch (mode) {
    //   case 'paragraph':
    //     lorem = L.paragraph(min, max);
    //     break;
    //   case 'title':
    //     lorem = L.title(min, max);
    //     break;
    //   case 'sentence':
    //     lorem = L.sentence(min, max);
    //     break;
    //   case 'date':
    //     lorem = L.date().string;
    //     break;
    //   case 'fullNameFL':
    //     lorem = L.firstLastName();
    //     break;
    // }

    // Return an array or each letter will be created as an individual element
    // The base element in the constructor determines what dom element it gets wrapped in
    return <span>{this.state.lorem}</span>;
  }

}

Lorem.TEXT = 'text';
Lorem.PARAGRAPH = 'paragraph';
Lorem.TITLE = 'title';
Lorem.SENTENCE = 'sentence';
Lorem.DATE = 'date';
Lorem.FULLNAMEFL= 'fullNameFL';