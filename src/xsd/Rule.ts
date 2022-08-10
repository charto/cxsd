// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {BaseClass} from './types/Base';

/** Parser rule, defines a handler class, valid attributes and children
  * for an XSD tag. */

export class Rule {
	constructor(proto: BaseClass) {
		this.proto = proto;
	}

	/** Constructor function for creating objects handling and representing the results of this parsing rule. */
	proto: BaseClass;

	/** List of allowed attributes. */
	attributeList: string[] = [];

	/** Table mapping the names of allowed child tags, to their parsing rules. */
	followerTbl: {[id: string]: Rule} = {};
}
