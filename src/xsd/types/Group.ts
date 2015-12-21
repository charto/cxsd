// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

class GroupBase extends types.ElementBase {
}

class GenericChildList extends GroupBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Element,
		Group,
		Sequence,
		Choice
	];

	resolve(state: State) {
		this.scope.addAllToParent('element', this.min, this.max);
	}
}

// <xsd:sequence>

export class Sequence extends GenericChildList {
}

// <xsd:choice>

export class Choice extends GenericChildList {
}

// <xsd:group>

export class Group extends GroupBase {
	static mayContain: () => types.BaseClass[] = () => [
		Sequence,
		Choice
	];

	init(state: State) {
		super.init(state);

		this.define(state, 'group');
	}

	resolve(state: State) {
		var group = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.source);
			group = this.scope.lookup(ref, 'group');
		}

		// Named groups are only models for referencing elsewhere.

		if(!this.name) {
			if(group) group.scope.addAllToParent('element', this.min, this.max, this.scope);
			else throw new types.MissingReferenceError(this, state, 'group', ref);
		}
	}

	name: string = null;
	ref: string = null;
}
