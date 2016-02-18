// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Type} from './Type';

export class Member {
	constructor(name: string) {
		this.surrogateKey = Member.nextKey++;
		this.name = name;
	}

	name: string;
	namespace: Namespace;
	safeName: string;
	prefix: string;

	typeList: Type[];

	comment: string;

	isAbstract: boolean;
	substitutes: Member;

	surrogateKey: number;
	private static nextKey = 0;
}
