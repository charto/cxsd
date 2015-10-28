import * as cget from 'cget';
import * as cxml from 'cxml';

const xmlConfig = new cxml.ParserConfig();

xmlConfig.bindNamespace(cxml.anonymous);
xmlConfig.addNamespace(cxml.xml1998);

const knownNamespaces: { [ prefix: string ]: string } = {
	xlink: 'http://www.w3.org/1999/xlink',
	xsd: 'http://www.w3.org/2001/XMLSchema'
};

for(let prefix of Object.keys(knownNamespaces)) {
	xmlConfig.addNamespace(new cxml.Namespace(prefix, knownNamespaces[prefix]));
}

export interface LoaderOptions {
	cache: cget.Cache;
}

export class SchemaLoader {

	constructor(options: LoaderOptions) {
		this.cache = options.cache;
	}

	import(xsdUrl: string) {
		this.cache.fetch(xsdUrl).then((result: cget.CacheResult) => {
			const xmlParser = xmlConfig.createParser();

			xmlParser.on('data', (chunk: cxml.TokenBuffer) => {
				let token = chunk[0];

				let lastNum = token instanceof cxml.RecycleToken ? token.lastNum : chunk.length - 1;
				let tokenNum = -1;

				while(tokenNum < lastNum) {

					token = chunk[++tokenNum];

					if(token instanceof cxml.Token) {
						console.log(token);
					}
				}
			});

			result.stream.pipe(xmlParser);
		});
	}

	cache: cget.Cache;

}
