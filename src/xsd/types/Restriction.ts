// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {DerivationBase} from './DerivationBase';
import * as types from '../types';

/** <xsd:restriction>
  * The schema allows a restriction to contain anything, but we parse only some useful restrictions. */

export class Restriction extends DerivationBase {
	static mayContain: () => types.BaseClass[] = () => DerivationBase.mayContain().concat([
		types.Enumeration
	]);

	// TODO: Remove this.
	init(state: State) {
		this.parent = state.parent;
	}

/*
	TODO: uncomment this when resolve function dependencies are handled.
	resolve(state: State) {
		var parent = state.parent.xsdElement;

		if(parent instanceof types.SimpleType) {
			parent.setEnumerationList(this.enumerationList);
		}

//		super.resolve(state);
	}
*/

	addEnumeration(content: string) {
		if(!this.enumerationList) {
			this.enumerationList = [];

			// TODO: Remove this and uncomment the resolve function.
			var parent = this.parent.xsdElement;

			if(parent instanceof types.SimpleType) {
				parent.setEnumerationList(this.enumerationList);
			}
		}
		this.enumerationList.push(content);
	}

	private parent: State; // TODO: Remove this.
	private enumerationList: string[];
}
