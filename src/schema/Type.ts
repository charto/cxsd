// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Member} from './Member';

export class Type {
	name: string;
	namespace: Namespace;

//	aliasable: boolean;	// Type can be represented as a type alias in TypeScript if attributeList and childList are empty, and it has no name.
	primitiveList: string[];

	attributeList: Member[];
	childList: Member[];

	parent: Type;

	comment: string;
}
