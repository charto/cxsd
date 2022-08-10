// This file is part of cxsd, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as cxml from 'cxml';

import {Namespace} from './Namespace';

export class Context extends cxml.ContextBase<Context, Namespace> {
	constructor() {
		super(Namespace);
	}
}
