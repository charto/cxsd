// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import {MemberBase} from './MemberBase';
import {TypeBase} from './TypeBase';
import * as types from '../types';

export interface ElementLike {
	id: string;
	minOccurs: string;
	maxOccurs: string;

	min: number;
	max: number;
}

/** <xsd:element> */

export class Element extends MemberBase implements ElementLike {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.SimpleType,
		types.ComplexType
	];

	init(state: State) {
		this.min = +this.minOccurs;
		if(this.maxOccurs == 'unbounded') this.max = Infinity;
		else this.max = +this.maxOccurs;

		this.define(state, 'element', this.min, this.max);
	}

	resolve(state: State) {
		var element = this.resolveMember(state, 'element') as Element;

		if(this.substitutionGroup) {
			// Add this as an alternative to the substitution group base element.
			var ref = new QName(this.substitutionGroup, state.source);
			var groupBase = this.scope.lookup(ref, 'element') as Element;

			if(!groupBase) throw new types.MissingReferenceError('element', ref);

			this.substitutes = groupBase;
			groupBase.isSubstituted = true;
		}
	}

	isAbstract() {
		return(this.abstract == 'true' || this.abstract == '1');
	}

	minOccurs: string = "1";
	maxOccurs: string = "1";

	default: string = null;

	/** Abstract elements are disallowed in the XML document,
	  * and another member of the same substitution group should be used. */
	abstract: string = null; // boolean
	substitutionGroup: string = null;

	substitutes: Element;
	isSubstituted: boolean;
}
