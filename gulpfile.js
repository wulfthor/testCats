var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

gulp.task('default', function() {
    nodemon({
        script: 'app.js',
        ext: 'js',
        env: {
            PORT: 3080
        },
        ignore: ['./node_modules/**']
    })
    .on('restart', function(){
        console.log('we have restarted');
    });

});
