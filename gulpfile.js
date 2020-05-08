'use strict';
const dirs = {
  source: 'src',
  build: 'build',
};

const gulp = require('gulp');
const sass = require("gulp-sass");
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const replace = require('gulp-replace');
const del = require('del');
const browserSync = require('browser-sync').create();
const ghPages = require('gulp-gh-pages');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const cheerio = require('gulp-cheerio');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-cleancss');
const include = require('gulp-file-include'); //include
const htmlbeautify = require('gulp-html-beautify');
const spritesmith = require('gulp.spritesmith');
const merge = require('merge-stream');
const buffer = require('vinyl-buffer');

gulp.task('sass', function(){
  return gulp.src(dirs.source + '/sass/style.scss')
    .pipe(include())
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(postcss([
        autoprefixer({ overrideBrowserslist: [
          'last 2 version',
          'last 7 Chrome versions',
          'last 10 Opera versions',
          'last 7 Firefox versions'
        ]}),
        mqpacker({ sort: true }),
    ]))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest(dirs.build + '/css/'))
    .pipe(browserSync.stream())
    .pipe(rename('style.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest(dirs.build + '/css/'));
});

gulp.task('html', function() {
  return gulp.src(dirs.source + '/*.html')
    .pipe(include())
    .pipe(htmlbeautify())
    .pipe(plumber({ errorHandler: onError }))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(dirs.build));
});


// ЗАДАЧА: Копирование изображений
gulp.task('img', function () {
  return gulp.src([
        dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',
      ],
      {since: gulp.lastRun('img')}
    )
    .pipe(plumber({ errorHandler: onError }))
    .pipe(newer(dirs.build + '/img'))
    .pipe(gulp.dest(dirs.build + '/img'));
});


gulp.task('img:opt', function () {
  return gulp.src([
      dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',
      '!' + dirs.source + '/img/sprite-svg.svg',
    ])
    .pipe(plumber({ errorHandler: onError }))
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(dirs.source + '/img'));
});


gulp.task('svgstore', function (callback) {
  var spritePath = dirs.source + '/img/svg-sprite';
  if(fileExist(spritePath) !== false) {
    return gulp.src(spritePath + '/*.svg')
      // .pipe(plumber({ errorHandler: onError }))
      .pipe(svgmin(function (file) {
        return {
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        }
      }))
      .pipe(svgstore({ inlineSvg: true }))

      .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');

            },
            parserOptions: {xmlMode: true}
        }))

      .pipe(rename('sprite-svg.svg'))
      .pipe(gulp.dest(dirs.source + '/img'));
  }
  else {
    console.log('Нет файлов для сборки SVG-спрайта');
    callback();
  }
});


gulp.task('png:sprite', function () {
  let fileName = 'sprite-png' + '.png';
  let spriteData = gulp.src('src/img/png-sprite/*.png')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(spritesmith({
      imgName: fileName,
      cssName: 'sprite-png.scss',
      padding: 4,
      imgPath: '../img/' + fileName
    }));
  let imgStream = spriteData.img
    .pipe(buffer())
    .pipe(imagemin())
    .pipe(gulp.dest(dirs.source + '/img'));
  let cssStream = spriteData.css
    .pipe(gulp.dest(dirs.source + '/sass/blocks'));
  return merge(imgStream, cssStream);
});


gulp.task('clean', function () {
  return del([
    dirs.build + '/**/*',
    '!' + dirs.build + '/readme.md'
  ]);
});


gulp.task('js', function () {
  return gulp.src([
      dirs.source + '/js/script.js'
    ])
    .pipe(include())
    .pipe(plumber({ errorHandler: onError }))
    .pipe(concat('script.js'))
    .pipe(gulp.dest(dirs.build + '/js'))
    .pipe(rename('script-min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(dirs.build + '/js'))
    .pipe(browserSync.stream());
});

gulp.task('copy', function() {
  return gulp.src(dirs.source + '/fonts/**/*.{woff,woff2}')
    .pipe(gulp.dest('build' + '/fonts'));
});


gulp.task('copy-css', function() {
  return gulp.src(dirs.source + '/css/blueimp-gallery.min.css')
    .pipe(gulp.dest('build' + '/css'));
});

gulp.task('build', gulp.series(
  'clean',
  'svgstore',
  'png:sprite',
  gulp.parallel('sass', 'img', 'js', 'copy'),
  'html'
));



gulp.task('serve', gulp.series('build', function() {
  browserSync.init({
    //server: dirs.build,
    server: {
      baseDir: './build/'
    },
    port: 3000,
    startPath: 'index.html',
    // open: false
  });

  gulp.watch(
    [
      dirs.source + '/**/*.html',
    ],
    gulp.series('html', reloader)
  );


  gulp.watch(
    dirs.source + '/sass/**/*.scss',
    gulp.series('sass')
  );

  gulp.watch(
    dirs.source + '/img/svg-sprite/*.svg',
    gulp.series('svgstore', 'html', reloader)
  );

  gulp.watch(
    dirs.source + '/img/png-sprite/*.png',
    gulp.series('png:sprite', 'sass')
  );

  gulp.watch(
    dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',
    gulp.series('img', reloader)
  );

  gulp.watch(
    dirs.source + '/js/**/*.js',
    gulp.series('js', reloader)
  );

}));


gulp.task('deploy', function() {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});


gulp.task('default',
  gulp.series('serve')
);


function reloader(done) {
  browserSync.reload();
  done();
}


function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

var onError = function(err) {
  notify.onError({
    title: 'Error in ' + err.plugin,
  })(err);
  this.emit('end');
};
