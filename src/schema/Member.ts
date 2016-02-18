// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Element} from './Element';
import {Type} from './Type';

// TODO: Rename to MemberRef!

export class Member {
	constructor(element: Element, min: number, max: number) {
		this.element = element;
		this.min = min;
		this.max = max;
	}

	element: Element;
	min: number;
	max: number;

	static optionalFlag = 1;
	static arrayFlag = 2;
	static anyFlag = 4;
}
