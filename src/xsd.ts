// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import {Cache} from './Cache';
import {Namespace} from './XsdState';

Namespace.register('http://www.w3.org/2001/XMLSchema', 'http://www.w3.org/2009/XMLSchema/XMLSchema.xsd', 'xsd');
Namespace.register(null, process.argv[2]).getSchema();
