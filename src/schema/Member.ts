// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';
import {Type} from './Type';
import * as exporter from './exporter';

export class Member {
	constructor(name: string, min: number, max: number) {
		this.name = name;
		this.min = min;
		this.max = max;
	}

	name: string;
	namespace: Namespace;
	safeName: string;
	prefix: string;

	min: number;
	max: number;

	typeList: Type[];

	comment: string;
}
