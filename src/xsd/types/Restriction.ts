// This file is part of fast-xml, copyright (c) 2015-2016 BusFaster Ltd.
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

	addEnumeration(content: string) {
		if(!this.enumerationList) this.enumerationList = [];
		this.enumerationList.push(content);
	}

	enumerationList: string[];
}
