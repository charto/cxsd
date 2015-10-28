// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';

import * as url from 'url';
import * as http from 'http';
import * as stream from 'stream';
import * as request from 'request';

export class Cache {

	constructor(basePath: string, indexName: string) {
		this.basePath = path.resolve(basePath);
		this.indexName = indexName;

		this.mkdirp(basePath);
	}

	mkdirp(pathName: string) {
		var partList = path.resolve(pathName).split(path.sep);
		var prefixList = partList.slice(0);

		// Remove path components until an existing directory is found.

		while(prefixList.length) {
			var prefixPath = prefixList.join(path.sep);

			try {
				var stats = fs.statSync(prefixPath);

				if(stats.isFile()) {
					// Trying to convert a file into a directory.
					// Rename the file to indexName and move it into the new directory.

					var tempPath = prefixPath + '.' + this.makeTempSuffix(6);

					fs.renameSync(prefixPath, tempPath);
					fs.mkdir(prefixPath);
					fs.renameSync(tempPath, path.join(prefixPath, this.indexName));
				} else if(!stats.isDirectory()) {
					throw(new Error('Tried to create a directory inside something weird: ' + prefixPath));
				}

				break;
			} catch(err) {
				if(err.code != 'ENOENT' && err.code != 'ENOTDIR') {
					// Weird!
					throw(err);
				}
			}

			prefixList.pop();
		}

		// Create path components that didn't exist yet.

		for(var partNum = prefixList.length; partNum < partList.length; ++partNum) {
			prefixPath += path.sep + partList[partNum];
			fs.mkdirSync(prefixPath);
		}
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

	addLinks(redirectList: string[], target: string) {
		for(var src of redirectList) {
			fs.writeFileSync(this.makeCachePath(src), 'LINK: ' + target + '\n', 'utf-8');
		}
	}

	makeCachePath(remoteUrl: string) {
		var cachePath = path.join(
			this.basePath,
			this.sanitizePath(remoteUrl.substr(remoteUrl.indexOf(':') + 1))
		);

		var isDir = false;

		if(remoteUrl.charAt(remoteUrl.length - 1) == '/') isDir = true;
		else try {
			var stats = fs.statSync(cachePath);
			if(stats.isDirectory()) isDir = true;
		} catch(e) {}

		if(isDir) cachePath = path.join(cachePath, this.indexName);

		return(cachePath);
	}

	fetchCached(remoteUrl: string, streamOut: stream.PassThrough) {
		var cachePath = this.makeCachePath(remoteUrl);

		try {
			var stats = fs.statSync(cachePath);

			var buf = new Buffer(6);
			var fd = fs.openSync(cachePath, 'r');

			fs.readSync(fd, buf, 0, 6, 0);
			fs.closeSync(fd);

			if(buf.equals(new Buffer('LINK: ', 'ascii'))) {
				var link = fs.readFileSync(cachePath, 'utf-8');

				remoteUrl = link.substr(6).replace(/\s+$/, '');
				cachePath = this.makeCachePath(remoteUrl);
			}

			this.remoteUrl = remoteUrl;
			fs.createReadStream(cachePath, {
				encoding: 'utf-8'
			}).pipe(streamOut);

			return(true);
		} catch(err) {
			if(err.code != 'ENOENT' && err.code != 'ENOTDIR') {
				// Weird!
				throw(err);
			}

			this.mkdirp(path.dirname(cachePath));

			return(false);
		}
	}

	storeCached(remoteUrl: string, streamIn: request.Request) {
		var cachePath = this.makeCachePath(remoteUrl);

		streamIn.pipe(fs.createWriteStream(cachePath));
	}


	fetch(remoteUrl: string) {
		var urlParts = url.parse(remoteUrl, false, true);
		var origin = urlParts.hostname || '';
		var streamOut = new stream.PassThrough();
		var streamIn: stream.Stream;
		var streamRequest: request.Request;
		var redirectList: string[] = [];
		var found = false;

		if(urlParts.pathname.charAt(0) != '/') origin += '/';

		origin += urlParts.pathname;

		remoteUrl = (urlParts.protocol || 'http:') + '//' + url.resolve('', origin);

		if(!this.fetchCached(remoteUrl, streamOut)) {
			streamRequest = request({
				url: remoteUrl,
				followRedirect: (res: http.IncomingMessage) => {
					redirectList.push(remoteUrl);

					remoteUrl = url.resolve(remoteUrl, res.headers.location);

					found = this.fetchCached(remoteUrl, streamOut);

					if(found) this.addLinks(redirectList, remoteUrl);

					return(!found);
				}
			});

			streamRequest.on('response', (res: http.IncomingMessage) => {
				if(found) return;

				this.storeCached(remoteUrl, streamRequest);

				this.remoteUrl = remoteUrl;
				streamRequest.pipe(streamOut);

				this.addLinks(redirectList, remoteUrl);
			});
		}

		return(streamOut);
	}

	basePath: string;
	indexName: string;
	remoteUrl: string;

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
