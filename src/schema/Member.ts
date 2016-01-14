// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from './Type';

export class Member {
	constructor(name: string, min: number, max: number) {
		this.name = name;
		this.min = min;
		this.max = max;
	}

	name: string;

	min: number;
	max: number;

	typeList: Type[];

	comment: string;
}
