// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {MemberBase} from './MemberBase';
import * as types from '../types';

export type XmlAttribute = string | number;

/** <xsd:attribute> */

export class Attribute extends MemberBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.SimpleType
	];

	init(state: State) {
		// Attributes appear exactly once unless they're optional.
		if(this.use == 'optional') this.min = 0;
		else this.min = 1; // assume 'required'
		this.max = 1;

		this.define(state, 'attribute', this.min, this.max);
	}

	resolve(state: State) {
		var attribute = this.resolveMember(state, 'attribute') as Attribute;
	}

	use: string = null;
	default: XmlAttribute = null;
}
