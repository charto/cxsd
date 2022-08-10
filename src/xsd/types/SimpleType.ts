// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import * as types from '../types';

/** <xsd:simpletype> */

export class SimpleType extends types.TypeBase {
	static mayContain: () => types.BaseClass[] = () => [
		types.Annotation,
		types.Restriction,
		types.List,
		types.Union
	];

	setEnumerationList(enumerationList: string[]) {
		this.enumerationList = enumerationList;
	}

	getEnumerationList() {
		return(this.enumerationList);
	}

	private enumerationList: string[];
}
