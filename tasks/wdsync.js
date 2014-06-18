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
var fs = require('fs');

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

  grunt.registerMultiTask('wdsync', 'The best Grunt plugin ever.', function() {
    var done = this.async();

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      encoding: 'utf8'
    });

    var filesToProcess = [];
    var remote_paths = options.remote_paths;

    // Iterate over all specified file groups.
    this.files.forEach(function(group) {
      group.src.forEach(function(file) {
        filesToProcess.push({
          src: file,
          dest: file.replace(options.strip, '')
        });
      })
    });

    // Verify we have files
    if(filesToProcess.length === 0) {
      grunt.verbose.writeln("No files found");
      done();
    }

    // Sort filenames by length
    filesToProcess.sort(function(a, b) {
      return a.dest.length - b.dest.length;
    });

    // Verify that the remote host is available
    async.each(remote_paths, function(remote_path, callback) {
      request.get(remote_path, function(error) {
        if(error) {
          grunt.log.error("Unable to connect to remote host: " + remote_path)
          callback();
        } else {
          async.each(filesToProcess, function(file, callback) {
            var remoteURL = url.resolve(remote_path, file.dest);

            if(grunt.file.isDir(file.src)) {
              request({uri: remoteURL, method: 'MKCOL'}, function(error) {
                if(error)
                  grunt.log.writeln("Error: " + error);
                else
                  grunt.log.writeln("MKCOL".green + " " + remoteURL.cyan);
              });
            } else {
              fs.createReadStream(file.src).pipe(request.put(remoteURL, function(error,message,response) {
                if(error)
                  grunt.log.writeln("Error: " + error);
                else
                  grunt.log.writeln("PUT".green + " " + remoteURL.cyan);
              }));
            }
          }, function(err) {
            if(err) {
              grunt.log.error(err.message);
              callback();
            } else {
              callback();
            }
          });
        }
      });
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
