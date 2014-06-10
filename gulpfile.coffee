gulp = require 'gulp'
coffee = require('gulp-coffee')
gutil = require('gulp-util')
browserify = require('browserify')
coffeeify = require('coffeeify')
glob = require('glob')
streamConvert = require('vinyl-source-stream')

gulp.task('coffee', () ->
  gulp.src('./src/*.coffee')
  .pipe(coffee({ bare: true }).on('error', gutil.log))
  .pipe(gulp.dest('./lib/'))
)

gulp.task('prepareTests', [], () ->
  bundler = browserify({entries: glob.sync("./test/*Tests.coffee"), extensions: [".coffee"] })
  bundler.transform(coffeeify)
  stream = bundler.bundle()
    .pipe(streamConvert('browserified.js'))
    .pipe(gulp.dest('./test'))
  return stream
)

gulp.task('browserify', () ->
  bundler = browserify("./lib/demo.js")
  bundler.bundle()
    .pipe(streamConvert('bundle.js'))
    .pipe(gulp.dest("./demo/"))
)

gulp.task 'build', ['coffee', 'browserify']
gulp.task 'default', ['build']
