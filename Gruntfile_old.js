module.exports = function(grunt) {
  var globalConfig = grunt.file.readJSON("package.json");
  var currentProject = null;
  process.argv.forEach(function (val, index, array) {
    if(index == 2){
      var tmp = val.split(":");
      if(tmp.length < 2){
        return;
      }
      if(tmp[0]=="start"||tmp[0]=="init"){
        currentProject = tmp[1];
        if(globalConfig["current"] != tmp[1]){
          globalConfig["current"] = tmp[1];
          grunt.file.write("package.json", JSON.stringify(globalConfig, null, 4));
        }
      }
    }
  });
  if(currentProject==null){
    currentProject = globalConfig["current"];
    if(currentProject == null){
      console.log("Grunt is error,Can't find the project");
      console.log("Corrent command like {grunt start:projectName}")
      process.exit(1);
    }
  }

  fs = require("fs");
  path = require("path");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-jade");
  grunt.loadNpmTasks("grunt-contrib-sass");
  grunt.loadNpmTasks("grunt-contrib-coffee");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-connect");
  // require('time-grunt')(grunt);
  // require('load-grunt-tasks')(grunt);
  var cf = globalConfig['projects'][currentProject];
  if(cf == undefined){
    console.log("Cant't found the project "+currentProject);
    process.exit(1);
  }
  var devPath = cf.dev;
  if(devPath==undefined){
    console.log("dev property is needed for "+currentProject);
    process.exit(1);
  }
  var relPath = cf.release;
  if (cf.release == undefined){
    relPath = cf.dev + "release/";
  }
  
  var testPath = cf.test == undefined ? devPath + "test/" : cf.test;
  var jadePath = cf.jade == undefined ? devPath + 'jade/' : cf.jade;
  if (!cf.sass) {
    cf.sass = currentProject + ".scss"
  }
  var debugPath = testPath;

  console.log(devPath);
  var config = {
    pkg: cf,
    connect: {
      options: {
        port: 9000,
        hostname: '127.0.0.1',
        base: testPath,
        directory: testPath,
        livereload: 35729
      },
      livereload: {
        options: {
          open: true
        },
        base: [testPath]
      }
    },
    uglify: {
      debug: {
        options: {
          mangle: false,
          beautify: false
        },
        files: {}
      },
      release: {
        options: {
          compress:{
            global_defs: {
              "DEBUG": false
            },
            dead_code: true
          },
          mangle: {
            except: ['jQuery', 'require', 'define','$scope','$http','$compile','$routeParams','$timeout','$element','$transclude','$location']
          },
          beautify: {
            ascii_only : true
          }
        },
        files: {}
      }
    },
    concat: {
      debug: {
        options: {},
        files: {}
      },
      release: {
        options: {},
        files: {}
      }
    },
    coffee: {
      debug: {
        options: {
          bare: true
        },
        files: {}
      },
      release: {
        options: {
          bare: true
        },
        files: {}
      }
    },
    sass: {
      release: {
        options: {
          style: 'compressed',
          trace: false
        },
        files: {}
      },
      dev: {
        options: {
          // lineNumbers: true,
          // style: "compact",
          debugInfo: true,
          // style: "compact"
          trace: false
        },
        files: {}
      }
    },
    jade: {
      compile: {
        options: {
          data: {
            debug: true
          },
          pretty: true
        },
        files: {}
        }
    },
    watch: {
      options: {
        nospawn: true,
        event: ['added','changed','deleted'],
        livereload: true
      },
      sass: {
        files: [devPath + "sass/*", devPath + "sass/**/*"],
        tasks: "sass:dev"
      },
      coffee: {
        files: [devPath + "coffee/*", devPath + "coffee/**/*"]
      },
      jade: {
        files: [jadePath + '*', jadePath + '**/*']
      },
      js: {
        files: [devPath + "js/*",devPath + "js/**/*"]
      }
    }
  };
  var ingore = function(name, ext) {
    if (path.extname(name) != ext) {
      return true;
    }
    if (name[0] == "_") return true;
    if (name.indexOf(".svn") > 0) {
      return true;
    }
    return false;
  };

  var initFile = function() {
    //合并文件
    var dirs = ["jade/", "js/", "js/mods/", "js/page/", "coffee/", "coffee/page/", "coffee/mods/", "sass/"];
    for (var j = 0; j < dirs.length; j++) {
      var dir = dirs[j];
      if (!fs.existsSync(devPath + dir)) {
        return;
      }
      var files = fs.readdirSync(devPath + dir);
      for (var i = files.length - 1; i >= 0; i--) {
        var name = path.basename(files[i]);
        if (name[0] == "_") {
          continue;
        }
        if (name.indexOf(".jade") > -1) { //合并jade
          var html = name.replace('.jade', '.html');
          config.jade.compile.files[testPath + html] = devPath + 'jade/' + name;
        } else if (name.indexOf(".js") > -1) { //合并js
          config.concat.debug.files[debugPath + dir + name] = [devPath + dir + name];
        } else if (name.indexOf(".coffee") > -1) { //合并coffee
          var tmp = dir + name;
          tmp = tmp.replace(new RegExp("coffee", "g"), "js");
          config.coffee.debug.files[debugPath + tmp] = [devPath + dir + name];
        } else if (name.indexOf(".scss") > -1) {
          var css = name.replace('.scss', '.css');
          config.sass.release.files[relPath + "css/" + css] = devPath + dir + name;
          if(cf.css != undefined){
            if(cf.css.indexOf(name) > -1){
              config.sass.dev.files[debugPath + "css/" + css] = devPath + dir + name;
            }
          }else{
            config.sass.dev.files[debugPath + "css/" + css] = devPath + dir + name;
          }
        }
      }
    }

    grunt.config.init(config);
  };
  grunt.event.on('watch', function(action, filepath, target) {
    if (action=='deleted') {
      if(target == "sass"){
        grunt.task.run(["compile", "sass:dev"]); //重新合并文件后，再编译
      }
      return;
    }
    if(target == "sass"){
      return;
    }
    var compileFile = "";
    var task = null;
    var files = {};
    var name = path.basename(filepath);
    console.log(name);
    switch(target){
      case "jade":
        var html = name.replace('.jade', '.html');
        compileFile = testPath + html;
        files[compileFile] = devPath + 'jade/' + name;
        grunt.config(["jade","compile", "files"],files);
        task = "jade:compile";
        break;
      case "js":
        compileFile = filepath.replace(/js\//gi, 'test/js/').replace(/js\\/gi, 'test/js/');
        files[compileFile] = filepath;
        grunt.config(["concat","debug", "files"],files);
        task = "concat:debug";
        break;
      case "coffee":
        compileFile = filepath.replace(/\.coffee/gi, ".js").replace(/coffee/gi, 'test/js');
        files[compileFile] = filepath;
        grunt.config(["coffee","debug", "files"],files);
        task = "coffee:debug";
        break;
    }
    if(task !== null){
      grunt.task.run(task);
    }
  });
  initFile();
  grunt.registerTask("jsRelease", function() {
    var dirs = ["js/", "js/mods/", "js/page/"];
    var sourcePath = testPath;
    for (var j = 0; j < dirs.length; j++) {
      var dir = dirs[j];
      if (!fs.existsSync(sourcePath + dir)) {
        return;
      }
      var files = fs.readdirSync(sourcePath + dir);
      for (var i = files.length - 1; i >= 0; i--) {
        var name = path.basename(files[i]);
        if (name[0] == "_" || name.indexOf(".js") == -1) {
          continue;
        }
        var min = name.replace(".js", "-min.js");
        config.uglify.release.files[relPath + dir + min] = [sourcePath + dir + name];
        config.concat.release.files[relPath + dir + name] = [sourcePath + dir + name];
        // config.concat.release.files[relPath + dir + min] = [relPath + dir + name];
      }
    }
  });
  //初始化目录结构
  grunt.registerTask("init", function() {
    if(!fs.existsSync(devPath)){
      var projectPath = path.resolve(devPath,"..");
      if(!fs.existsSync(projectPath)){
        fs.mkdirSync(projectPath);
      }
      fs.mkdirSync(devPath);
    }
    if(!fs.existsSync(relPath)){
      fs.mkdirSync(relPath);
    }
    var dirs = [relPath, relPath + 'css/', relPath + 'css/base/', relPath + 'css/mods/', relPath + 'js/', relPath + 'js/base/', relPath + 'js/mods/', relPath + 'js/page/', testPath, debugPath, debugPath + 'css/', debugPath + 'css/base/', debugPath + 'css/mods/', debugPath + 'js/', debugPath + 'js/base/', debugPath + 'js/mods/', debugPath + 'js/page/', jadePath, jadePath + 'base/', jadePath + 'mods/', devPath + 'coffee/', devPath + 'coffee/page/', devPath + 'coffee/mods/', devPath + 'js/', devPath + 'js/base/', devPath + 'js/mods/', devPath + 'js/page/', devPath + 'sass/', devPath + 'sass/base/', devPath + 'sass/mods/', devPath + 'sass/page/'];
    for (var i = 0; i < dirs.length; i++) {
      console.log(dirs[i]);
      if (!fs.existsSync(dirs[i])) {
        fs.mkdirSync(dirs[i]);
      }
    }
    console.log("Init Finish");
  });

  //合并scss 索引文件
  grunt.registerTask("combile", function() {
    var rootDir = devPath + "sass/";
    var combile = {};
    combile[cf.sass] = ["base", "mods"];
    var list = function(files, name) {
      var container = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var currentPath = rootDir + file;
        var fileList = fs.readdirSync(currentPath);
        for (var p = 0; p < fileList.length; p++) {
          var currentFile = currentPath + "/" + fileList[p];
          if (grunt.file.isFile(currentFile) && currentFile.indexOf(".scss") > 0 && cf.sass != fileList[p] && currentFile.indexOf("/all.scss")==-1) {
            container.push(file + "/" + fileList[p]);
          }
        }
      }
      if (container.length > 0) {
        combile[name] = container;
      }
    }

    list(["base", "mods", "page"], cf.sass);
    var files = fs.readdirSync(rootDir);
    for (var i = files.length - 1; i >= 0; i--) { //合并其它文件夹
      var file = files[i];
      var currentPath = rootDir + file;
      if (grunt.file.isDir(currentPath) && "base|mods|page".indexOf(file) < 0) {
        var name = path.basename(file);
        list([file], name);
      }
    }

    for (var key in combile) {
      var content = combile[key].join('";\n@import "');
      var sassFile = null;
      if (key == cf.sass) {
        sassFile = devPath + "sass/" + key;
      }else{
        sassFile = devPath + "sass/" + key + "/all.scss";
      }
      if (grunt.file.isFile(sassFile)) {
        grunt.file.delete(sassFile);
      }
      grunt.file.write(sassFile, '@import "' + content + '"');
    }
  });

  //创建文件
  grunt.registerTask("c", function(filename) {
    var files = [];
    var extname = path.extname(filename);
    if (".jade|.js|.scss|.coffee".indexOf(extname) < 0 || !extname) {
      console.log("Error File Type");
      console.log("Created '" + filename + "' Fail");
      return;
    }
    if (filename[0] == '_') {
      if (extname == '.js') {
        files['js'] = devPath + 'js/mods/' + filename.substr(1);
      } else {
        files['jade'] = jadePath + 'mods/' + filename.substr(1);
        files['sass'] = devPath + 'sass/mods/' + filename.substr(1).replace('.jade', '.scss');
      }
    } else {
      if (extname == '.js') {
        files['js'] = devPath + 'js/' + filename;
      } else {
        if (extname !== '.scss') {
          files['jade'] = jadePath + filename;
        }
        files['sass'] = devPath + 'sass/page/' + filename.replace('.jade', '.scss');
      }
    }
    for (var i in files) {
      var file = files[i];
      if (!fs.existsSync(file)) {
        fs.open(file, 'w', '0644', function(e, fd) {
          console.log(fd);
          if (e) throw e;
          grunt.file.write(fd, "", {
            encoding: "utf8"
          });
          console.log("create " + file + " Success");
        });
      }
    }
    initFile();
  });

  grunt.registerTask('default', ["combile", "jsRelease","concat:debug","coffee:debug", "sass:dev", "sass:release", "coffee:debug", "concat:release", "uglify:release", "jade:compile"]);
  grunt.registerTask('test', ["combile", "concat:debug","coffee:debug", "sass:dev", "coffee:debug", "jade:compile"]);
  grunt.registerTask('start', ["connect:livereload", "watch"]);
};