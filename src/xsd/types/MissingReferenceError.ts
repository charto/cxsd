// This file is part of cxsd, copyright (c) 2015-2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {State} from '../State';
import {QName} from '../QName';
import {Base} from './Base';

export class MissingReferenceError extends Error {
	constructor(type: string, ref: QName) {
		super();

		this.name = 'MissingReferenceError';
		this.message = 'Missing ' + type + ': ' + ref.format();

		super(this.message);
	}
}
