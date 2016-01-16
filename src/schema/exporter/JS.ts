// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as Promise from 'bluebird';

import {Cache} from 'cget'
import {Exporter} from './Exporter';
import {Namespace} from '../Namespace';

export class JS extends Exporter {
	/** Output namespace contents to the given cache key. */

	forceExport(outName: string): Promise<Namespace> {
		return(null);
	}

	getCache() {
		return(JS.cache);
	}

	getOutName(name: string) {
		return(name + '.js');
	}

	/** Cache where all output is written. */
	private static cache = new Cache('cache/js', '_index.js');
}
