// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';

import * as url from 'url';
import * as http from 'http';
import * as stream from 'stream';
import * as request from 'request';
import * as Promise from 'bluebird';

Promise.longStackTraces();

var fsa = {
	stat: Promise.promisify(fs.stat),
	open: Promise.promisify(fs.open),
	close: Promise.promisify(fs.close),
	rename: Promise.promisify(fs.rename),
	mkdir: Promise.promisify(fs.mkdir),
	read: Promise.promisify(fs.read),
	readFile: Promise.promisify(fs.readFile) as any as (name: string, options: {encoding: string; flag?: string;}) => Promise<string>,
	writeFile: Promise.promisify(fs.writeFile) as (name: string, content: string, options: {encoding: string; flag?: string;}) => void
};

var againSymbol = {};
var again = () => againSymbol;

function repeat<T>(fn: (again: () => {}) => Promise.Thenable<T>): Promise.Thenable<T> {
	return(Promise.try(() =>
		fn(again)
	).then((result: T) =>
		(result == againSymbol) ? repeat(fn) : result
	));
}

export interface CacheResult {
	stream: stream.Readable;
	url: string;
}

// TODO: limit simultaneous downloads.

export class Cache {

	constructor(pathBase: string, indexName: string) {
		this.pathBase = path.resolve(pathBase);
		this.indexName = indexName;
	}

	mkdirp(pathName: string) {
		var partList = path.resolve(pathName).split(path.sep);
		var prefixList = partList.slice(0);
		var pathPrefix: string;

		// Remove path components until an existing directory is found.

		return(repeat((again: () => {}) => {
			if(!prefixList.length) return;

			pathPrefix = prefixList.join(path.sep);

			return(Promise.try(() => fsa.stat(pathPrefix)).then((stats: fs.Stats) => {
				if(stats.isFile()) {
					// Trying to convert a file into a directory.
					// Rename the file to indexName and move it into the new directory.

					var tempPath = pathPrefix + '.' + this.makeTempSuffix(6);

					return(Promise.try(() =>
						fsa.rename(pathPrefix, tempPath)
					).then(() =>
						fsa.mkdir(pathPrefix)
					).then(() =>
						fsa.rename(tempPath, path.join(pathPrefix, this.indexName))
					));
				} else if(!stats.isDirectory()) {
					throw(new Error('Tried to create a directory inside something weird: ' + pathPrefix));
				}
			}).catch((err: NodeJS.ErrnoException) => {
				// Re-throw unexpected errors.
				if(err.code != 'ENOENT' && err.code != 'ENOTDIR') throw(err);

				prefixList.pop();
				return(again());
			}));
		})).then(() => Promise.reduce(
			// Create path components that didn't exist yet.
			partList.slice(prefixList.length),
			(pathPrefix: any, part: string, index: number, len: number) => {
				console.error(['CREATE NEW PATH', pathPrefix, part, partList.length, prefixList.length].join('\t'));
				var pathNew = pathPrefix + path.sep + part;

				return(Promise.try(() =>
					fsa.mkdir(pathNew)
				).catch((err: NodeJS.ErrnoException) => {
					// Because of a race condition with simultaneous cache stores,
					// the directory might already exist.

					if(err.code != 'EEXIST') throw(err);
				}).then(() =>
					pathNew
				));
			},
			pathPrefix
		));
	}

	// Create a string of random letters and numbers.

	makeTempSuffix(length: number) {
		return(
			Math.floor((Math.random() + 1) * Math.pow(36, length))
			.toString(36)
			.substr(1)
		)
	}

	sanitizePath(path: string) {
		return(path
			// Remove unwanted characters.
			.replace(/[^-_./0-9A-Za-z]/g, '_')

			// Remove - _ . / from beginnings of path parts.
			.replace(/(^|\/)[-_./]+/g, '$1')

			// Remove - _ . / from endings of path parts.
			.replace(/[-_./]+($|\/)/g, '$1')
		);
	}

	// Store HTTP redirects as files containing the new URL.

	addLinks(redirectList: string[], target: string) {
		return(Promise.map(redirectList, (src: string) => {
			this.makeCachePath(src).then((cachePath: string) =>
				fsa.writeFile(cachePath, 'LINK: ' + target + '\n', {encoding: 'utf-8'})
			)
		}));
	}

	isDir(cachePath: string) {
		return(fsa.stat(cachePath).then(
			(stats: fs.Stats) => stats.isDirectory()
		).catch(
			(err: NodeJS.ErrnoException) => false
		));
	}

	// Get local cache file path where a remote URL should be downloaded.
	// Also create the directory containing it.

	makeCachePath(urlRemote: string) {
		var cachePath = path.join(
			this.pathBase,
			this.sanitizePath(urlRemote.substr(urlRemote.indexOf(':') + 1))
		);

		var makeValidPath = (isDir: boolean) => {
			if(isDir) cachePath = path.join(cachePath, this.indexName);

			return(this.mkdirp(path.dirname(cachePath)).then(() => cachePath));
		};

		if(urlRemote.charAt(urlRemote.length - 1) == '/') {
			return(makeValidPath(true));
		}

		return(this.isDir(urlRemote).then(makeValidPath));
	}

	sanitizeUrl(urlRemote: string) {
		var urlParts = url.parse(urlRemote, false, true);
		var origin = urlParts.hostname || '';

		if(urlParts.pathname.charAt(0) != '/') origin += '/';

		origin += urlParts.pathname;
		return((urlParts.protocol || 'http:') + '//' + url.resolve('', origin));
	}

	// Fetch URL from cache or download it if not available yet.
	// Returns the file's URL after redirections and a readable stream of its contents.

	fetch(urlRemote: string) {
		urlRemote = this.sanitizeUrl(urlRemote);

		var result = this.fetchCached(urlRemote).catch((err: NodeJS.ErrnoException) => {
			// Re-throw unexpected errors.
			if(err.code != 'ENOENT') throw(err);

			return(this.fetchRemote(urlRemote));
		});

		return(result);
	}

	fetchCached(urlRemote: string) {
		var cachePath = this.makeCachePath(urlRemote);
		var targetPath = Promise.all([
			cachePath,
			cachePath.then((cachePath: string) => fsa.open(cachePath, 'r'))
		]).spread((cachePath: string, fd: number) => {
			// Check if there's a cached link redirecting the URL.

			var buf = new Buffer(6);

			return(fsa.read(fd, buf, 0, 6, 0).then(() => {
				fsa.close(fd);

				if(buf.equals(new Buffer('LINK: ', 'ascii'))) {
					fsa.readFile(cachePath, {encoding: 'utf-8'}).then((link: string) => {
						urlRemote = link.substr(6).replace(/\s+$/, '');

						return(this.makeCachePath(urlRemote));
					});
				} else return(cachePath);
			}));
		});

		var cachedResult = targetPath.then((targetPath: string): CacheResult => {
			return({
				stream: fs.createReadStream(targetPath, {encoding: 'utf-8'}),
				url: urlRemote
			})
		});

		return(cachedResult);
	}

	fetchRemote(urlRemote: string) {
		var redirectList: string[] = [];
		var found = false;
		var resolve: (result: any) => void;
		var reject: (err: any) => void;
		var promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		})

		var streamRequest = request({
			url: urlRemote,
			followRedirect: (res: http.IncomingMessage) => {
				redirectList.push(urlRemote);
				urlRemote = url.resolve(urlRemote, res.headers.location);

				this.fetchCached(urlRemote).then((result: CacheResult) => {
					if(found) return;
					found = true;

					this.addLinks(redirectList, urlRemote).then(() => {
						resolve(result);
					});
				}).catch((err: NodeJS.ErrnoException) => {
					if(err.code != 'ENOENT' && err.code != 'ENOTDIR') {
						// Weird!
						reject(err);
					}
				});

				return(true);
			}
		});

		streamRequest.on('response', (res: http.IncomingMessage) => {
			if(found) return;
			found = true;

//			var streamBuffer = new stream.PassThrough();
			streamRequest.pause();

			this.makeCachePath(urlRemote).then((cachePath: string) => {
				var streamOut = fs.createWriteStream(cachePath);
				streamRequest.pipe(streamOut);
				streamRequest.resume();

				streamOut.on('finish', () => {
					console.log('FINISHED ' + urlRemote);

					// Output stream file handle stays open after piping unless manually closed.

					streamOut.close();
				});

				return(this.addLinks(redirectList, urlRemote));
			}).then(() => {
				resolve({
					stream: streamRequest,
					url: urlRemote
				});
			});
		});

		return(promise);
	}

	pathBase: string;
	indexName: string;

}

/*
// TODO tests:

console.log(Cache.sanitizePath('..'));
// ''
console.log(Cache.sanitizePath('../bar'));
// 'bar'
console.log(Cache.sanitizePath('foo/../1.2.3/bar'));
// 'foo/1.2.3/bar'
console.log(Cache.sanitizePath('/foo/.bar.1.2.3.'));
// 'foo/bar.1.2.3'
console.log(Cache.sanitizePath('//foo/-..-/.bar/'));
// 'foo/bar'
*/
