// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Namespace} from './Namespace';

export interface NamespaceRef {
	shortName: string;
	relativePath: string;
	Namespace: Namespace;
}
