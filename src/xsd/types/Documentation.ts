// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import * as types from '../types';

/** <xsd:documentation>
  * Works like a comment usable in almost any part of the schema. */

export class Documentation extends types.Base {
	init(state: State) {
		state.startText(this);
	}

	addText(state: State, text: string) {
		this.commentList.push(text);
	}

	loaded(state: State) {
		state.endText();
	}

	resolve(state: State) {
		this.scope.addCommentsToGrandParent(this.commentList);
	}

	commentList: string[] = [];
}
