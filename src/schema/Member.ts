// This file is part of fast-xml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Type} from './Type';

export class Member {
	name: string;

	min: number;
	max: number;

	typeList: Type[];

	comment: string;
}
