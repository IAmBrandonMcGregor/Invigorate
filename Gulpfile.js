
// Include all dependencies.
var gulp = require("gulp"),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    livereload = require("gulp-livereload"),
    connectLiveReload = require('connect-livereload'),
    lr = require("tiny-lr"),
    liveReloadServer = lr(),
    open = require("open"),
    express = require("express");


// Define the task for CSS/Sass compilation.
gulp.task('styles', function () {
  return gulp.src('example/example.scss')
    .pipe(sass({ style: 'expanded' }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('example/'))
    .pipe(livereload(liveReloadServer));
});

gulp.task('watch', function () {

	// Start the LiveReload socket server.
	liveReloadServer.listen(35729, function (error) {

    // watch for .scss changes.
    gulp.watch(['example/example.scss'], ['styles']);

		// watch for changes to local js and html.
		gulp.watch(['example/index.html', '*.js'], function refresh (event) {
			gulp.src(event.path, {read:false}).pipe(livereload(liveReloadServer));
		});
	});

});

gulp.task('default', ['styles'], function () {

	// Create the ExpressJS server.
	var express = require('express'),
		app = express();

	// Add the connect-livereload middleware
	app.use(connectLiveReload());

	// Host the static index.html file.
	app.use('/', express.static(__dirname + '/'));

	// start the ExpressJS server.
	app.listen(9923);

	// Start the watch task to livereload when files change.
	gulp.start('watch');

	// Launch a web browser.
	open('http://localhost:9923/example/');
});
