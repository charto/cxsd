import * as path from 'path';
import * as cget from 'cget';

import { SchemaLoader } from '..';

const cache = new cget.Cache(
	path.resolve(__dirname, 'xsd'),
	{
		allowLocal: true,
		allowRemote: true,
		allowCacheRead: true,
		allowCacheWrite: true
	}
);

const loader = new SchemaLoader({ cache });

loader.import('http://www.opengis.net/wfs');
