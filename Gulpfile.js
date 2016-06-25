var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    testem = require('gulp-testem'),
    http = require('http');
gulp.task('lint', function () {
  return gulp.src(['./src/**/*.js', './test/**/*.js'])
        .pipe(jshint({
          globals: {
            _: false,
            $: false,
            jasmine: false,
            browser: true,
            devel: true,
            describe: false,
            it: false,
            expect: false,
            beforeEach: false,
            afterEach: false,
            sinon: false
          }
        }))
        .pipe(jshint.reporter('default'));
        console.log('linter was run');
});

gulp.task('coverage', function () {
  var coverageServer = http.createServer(function (req, resp) {
        req.pipe(fs.createWriteStream('coverage.json'))
        resp.end()
    });

    var port = 7358;
    coverageServer.listen(port);
    console.log("Coverage Server Started on port", port);
});

gulp.task('testem', ['coverage', 'lint'], function () {
  gulp.src([''])
      .pipe(testem({
        configFile: 'testem.json'
      }));
});
