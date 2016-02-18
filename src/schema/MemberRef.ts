// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Member} from './Member';
import {Type} from './Type';

export class MemberRef {
	constructor(member: Member, min: number, max: number) {
		this.member = member;
		this.min = min;
		this.max = max;
	}

	member: Member;
	min: number;
	max: number;

	static optionalFlag = 1;
	static arrayFlag = 2;
	static anyFlag = 4;
}
