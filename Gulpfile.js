
// Include all dependencies.
var gulp = require("gulp"),
	livereload = require("gulp-livereload"),
	connectLiveReload = require('connect-livereload'),
	lr = require("tiny-lr"),
	liveReloadServer = lr(),
	open = require("open"),
	express = require("express");


gulp.task('watch', function () {

	// Start the LiveReload socket server.
	liveReloadServer.listen(35729, function (error) {
		// watch the example usage index.html file.
		gulp.watch('index.html', function (event) {
			gulp.src(event.path, {read:false}).pipe(livereload(liveReloadServer));
		});
	});

});

gulp.task('default', function () {

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
	open('http://localhost:9923');
});