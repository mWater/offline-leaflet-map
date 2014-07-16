gulp = require 'gulp'
coffee = require('gulp-coffee')
gutil = require('gulp-util')
uglify = require('gulp-uglify')
browserify = require('browserify')
glob = require('glob')
streamConvert = require('vinyl-source-stream')
buffer = require('vinyl-buffer')
rename = require("gulp-rename")

gulp.task 'coffee', () ->
  gulp.src('./src/*.coffee')
  .pipe(coffee({ bare: true }).on('error', gutil.log))
  .pipe(gulp.dest('./lib/'))

gulp.task 'prepareTests', ['build'], () ->
  bundler = browserify({entries: glob.sync("./test/*Tests.coffee"), extensions: [".coffee"] })
  stream = bundler.bundle()
    .pipe(streamConvert('browserified.js'))
    .pipe(gulp.dest('./test'))
  return stream

gulp.task 'demo', () ->
  bundler = browserify("./demo.coffee",
    extensions: [".coffee"]
    basedir: "./src/")
  bundler.bundle()
    .pipe(streamConvert('bundle.js'))
    .pipe(gulp.dest("./demo/"))

gulp.task 'standalone', () ->
  bundler = browserify("./standalone.coffee",
    extensions: [".coffee"]
    basedir: "./src/")
  bundler.bundle()
    .pipe(streamConvert('offlinemap.js'))
    .pipe(gulp.dest("./dist/"))
    .pipe(buffer())
    .pipe(rename("offlinemap.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'))

gulp.task 'build', ['coffee', 'demo', 'standalone']
gulp.task 'default', ['build']
