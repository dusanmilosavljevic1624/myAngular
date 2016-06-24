var gulp = require('gulp'),
    jshint = require('gulp-jshint');

gulp.task('lint', function () {
  return gulp.src('./src/**/*.js')
        .pipe(jshint({
          globals: {
            _: false,
            $: false
          },
          browser: true,
          devel: true
        }))
        .pipe(jshint.reporter('default'))
});
