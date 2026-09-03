'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var UglifyJS = require('uglify-js');
var buildConfig = require('../config/build.config');
var pkg = require('../package.json');

var root = path.resolve(__dirname, '..');
var destination = path.join(root, 'release/js');
var banner = buildConfig.banner.replace('<%= pkg.version %>', pkg.version);

function expand(patterns) {
  var files = [];
  patterns.forEach(function(pattern) {
    glob.sync(pattern, { cwd: root, nodir: true }).sort().forEach(function(file) {
      files.push(file);
    });
  });
  return files;
}

function read(files) {
  return files.map(function(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
  }).join('\n');
}

function minify(source, fileName) {
  var result = UglifyJS.minify(source, {
    compress: { drop_console: true },
    mangle: true,
    output: { comments: false }
  });
  if (result.error) {
    throw result.error;
  }
  fs.writeFileSync(path.join(destination, fileName), banner + result.code + '\n');
}

function buildLibrary(name, patterns, replaceVersion) {
  var source = read(expand(patterns));
  if (replaceVersion) {
    source = source.replace(/<%= pkg\.version %>/g, pkg.version);
  }
  source = banner + buildConfig.closureStart + source + buildConfig.closureEnd + '\n';
  fs.writeFileSync(path.join(destination, name + '.js'), source);
  minify(source, name + '.min.js');
}

fs.mkdirSync(destination, { recursive: true });
buildLibrary('ionic', buildConfig.ionicFiles, true);
buildLibrary('ionic-angular', buildConfig.angularIonicFiles, false);

fs.writeFileSync(
  path.join(destination, 'ionic.bundle.js'),
  (buildConfig.bundleBanner + read(buildConfig.ionicBundleFiles.map(function(file) {
    return 'release/' + file;
  }))).replace(/\s+$/, '\n')
);

fs.writeFileSync(
  path.join(destination, 'ionic.bundle.min.js'),
  (buildConfig.bundleBanner + read(buildConfig.ionicBundleFiles.map(function(file) {
    return 'release/' + file.replace(/\.js$/, '.min.js');
  }))).replace(/\s+$/, '\n')
);
