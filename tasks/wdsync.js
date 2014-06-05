/*
* grunt-wdsync
* https://github.com/eclifford/grunt-wdsync
*
* Copyright (c) 2014 eclifford
* Licensed under the MIT license.
*/

'use strict';

var url = require('url');
var request = require('request');
var async = require('async');
var path = require('path');

module.exports = function(grunt) {

  var prepareHTTPOptions = function(remoteURL, verb) {
    var parsedUrl = url.parse(remoteURL);
    var auth = parsedUrl.auth;

    if(auth !== null) {
      var splittedString = auth.split(":");
      auth = {
        user: splittedString[0],
        pass: splittedString[1],
        sendImmediately: false
      };
    }

    var options = {
      uri: parsedUrl,
      method: verb,
      auth: auth
    };

    options.uri.auth = "";
    return options;
  }

  var processHTTPRequest = function(remoteURL, verb, data, callback) {
    var options = prepareHTTPOptions(remoteURL, verb);
    options.body = data;

    request(options, function(error, res, body) {
      if(error) {
        grunt.verbose.writeln("Error: " + error);
        callback({status: res.statusCode, message: error});
      } else {
        grunt.verbose.writeln("Asset created: " + remoteURL);
        callback(null, remoteURL);
      }
    }).setMaxListeners(12);
  }

  grunt.registerMultiTask('wdsync', 'The best Grunt plugin ever.', function() {
    var done = this.async();

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
    });

    var filesToProcess = [];
    var remote_path = options.remote_path;

    // Iterate over all specified file groups.
    this.files.forEach(function(group) {
      group.src.forEach(function(file) {
        console.log(file);
        filesToProcess.push({
          src: file,
          dest: group.dest
        });
      })
    });

    // Sort filenames by length
    filesToProcess.sort(function(a, b) {
      return a.dest.length - b.dest.length;
    });

    async.each(filesToProcess, function(file, callback) {
      var remoteURL = url.resolve(remote_path, file.dest);

      if(grunt.file.isDir(file.src)) {
        processHTTPRequest(remoteURL, 'MKCOL', null, callback);
      } else {
        processHTTPRequest(remoteURL, 'PUT', grunt.file.read(file.src), callback);
      }
    }, function(err) {
      if(err) {
        grunt.log.error(err.message);
        done(false);
      } else {
        done();
      }
    });
  });

};
