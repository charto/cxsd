// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as cxml from 'cxml';

import {Namespace} from './Namespace';
import {Type} from './Type';

export class Member extends cxml.MemberBase<Member, Namespace, cxml.ItemBase<Member>> {
	constructor(name: string) {
		super(null, name);
		this.surrogateKey = Member.nextKey++;
	}

	typeList: Type[];
	substitutes: Member;

	/** Proxy type containing other substitution group members. */
	proxy: Type;

	comment: string;

	isExported: boolean;

	surrogateKey: number;
	private static nextKey = 0;
}
