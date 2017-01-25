// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {ContextBase} from 'cxml';

import {Namespace} from './Namespace';

export class Context extends ContextBase<Context, Namespace> {
	constructor() {
		super(Namespace);
	}
}
