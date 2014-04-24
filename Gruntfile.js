module.exports = function (grunt) {
  var globalConfig = grunt.file.readJSON("package.json");
  var currentProject = null;
  process.argv.forEach(function (val, index, array) {
    if (index == 2) {
      var tmp = val.split(":");
      if (tmp.length < 2) {
        return;
      }
      if (tmp[0] == "start" || tmp[0] == "init") {
        currentProject = tmp[1];
        if (globalConfig["current"] != tmp[1]) {
          globalConfig["current"] = tmp[1];
          grunt.file.write("package.json", JSON.stringify(globalConfig, null, 4));
        }
      }
    }
  });
  if (currentProject == null) {
      currentProject = globalConfig["current"];
      if (currentProject == null) {
          grunt.log.writeln("Grunt is error,Can't find the project");
          grunt.log.writeln("Corrent command like {grunt start:projectName}")
          process.exit(1);
      }
  }
  fs = require("fs");
  path = require("path");
  // grunt.loadNpmTasks("grunt-contrib-uglify");
  // grunt.loadNpmTasks("grunt-contrib-watch");
  // grunt.loadNpmTasks("grunt-contrib-jade");
  // grunt.loadNpmTasks("grunt-contrib-sass");
  // grunt.loadNpmTasks("grunt-contrib-coffee");
  // grunt.loadNpmTasks("grunt-contrib-concat");
  // grunt.loadNpmTasks("grunt-contrib-connect");
  require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

  var cf = globalConfig['projects'][currentProject];
  if (cf == undefined) {
      grunt.log.writeln("Cant't found the project " + currentProject);
      process.exit(1);
  }
  var devPath = path.resolve(cf.dev) + path.sep;
  if (devPath == undefined) {
      grunt.log.writeln("dev property is needed for " + currentProject);
      process.exit(1);
  }
  var relPath = cf.release;
  if (cf.release == undefined) {
      relPath = cf.dev + "release/";
  }
  relPath = path.resolve(relPath) + path.sep;
  if (!cf.debug) {
      cf.debug = devPath + "debug";
  }
  if (!cf.jade) {
      cf.jade = devPath + "jade";
  }
  var debugPath = path.resolve(cf.debug) + path.sep;
  var jadePath = path.resolve(cf.jade) + path.sep;
  if (!cf.sass) {
      cf.sass = currentProject + ".scss";
  }
  grunt.log.writeln(devPath);
  var config = {
    pkg: cf,
    connect: {
      options: {
          port: 9000,
          hostname: '127.0.0.1',
          base: debugPath,
          directory: debugPath,
          livereload: 35729
      },
      livereload: {
          options: {
              open: true
          },
          base: [debugPath]
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
              compress: {
                  global_defs: {
                      "DEBUG": false
                  },
                  dead_code: true,
                  drop_console:true
              },
              mangle: {
                  except: ['jQuery', 'require', 'define', '$scope', '$http', '$compile', '$routeParams', '$timeout', '$element', '$transclude', '$location']
              },
              beautify: {
                  ascii_only: true
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
              debugInfo: false,
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
          event: ['added', 'changed', 'deleted', 'all'],
          livereload: true
      },
      sass: {
          files: [devPath + "sass/*", devPath + "sass/**/*"]
      },
      coffee: {
          files: [devPath + "coffee/*", devPath + "coffee/**/*"]
      },
      jade: {
          files: [jadePath + '*', jadePath + '**/*']
      },
      js: {
          files: [devPath + "js/*", devPath + "js/**/*"]
      }
    }
  };
  //删除数组
  var combileJS = function (file, targetFile) {
      var result = {};
      var dirs = path.dirname(targetFile).split(path.sep);
      var length = dirs.length;
      var dirName = dirs[length - 1];
      if (dirName != "page" && dirName != "mods" && dirName != "base" && dirName != "js") {
          var list = [];
          dirs[length] = dirs[length - 1];
          dirs[length - 1] = "page";
          targetFile = dirs.join(path.sep) + ".js";
          var ext = path.extname(file);
          if (ext == ".js") {
              list.push(path.dirname(file) + path.sep + "*.js");
          }
          if (ext == ".coffee") {
              list.push(path.dirname(file) + path.sep + "*.coffee");
          }
          result.val = list;
      } else {
          result.val = file;
      }
      result.key = targetFile;
      return result;
  }

  var watchFile = function (file) {
      var ext = path.extname(file);
      var name = path.basename(file);
      if (name[0] == "." || ext == null) { //私有文件或文件夹跳过
        return;
      }
      var targetFile = null;
      if (ext == ".jade") { //合并jade
          var dirs = path.dirname(file).split(path.sep);
          var index = dirs.length - 1;

          /*批处理jade根目录下的文件 : 公用模板文件修改后，跟新所有页面*/
          if(dirs[index] != "jade" && dirs[index] != "module"){
            // config.jade.compile.expand = true;
            // config.jade.compile.cwd = jadePath;
            // config.jade.compile.src = ['*.jade'];
            // config.jade.compile.dest =  debugPath;
            // config.jade.compile.ext = '.html';
            return;
          }
          // /*删除批处理配置项,改为单个文件处理*/
          // delete config.jade.compile.expand;
          // delete config.jade.compile.cwd;
          // delete config.jade.compile.src;
          // delete config.jade.compile.dest;
          // delete config.jade.compile.ext;
          
          if ("." + dirs[index] != ext && dirs[index] == "module")
              index--;
          dirs[index] = "debug";
          dirs.push(name.replace(".jade", ".html"));
          targetFile = dirs.join(path.sep);
          config.jade.compile.files[targetFile] = file;

      } else if (ext == ".js") {//合并js
          targetFile = file.replace(/js\//gi, 'debug'+path.sep+'js'+path.sep).replace(/js\\/gi, 'debug'+path.sep+'js'+path.sep);
          var target = combileJS(file, targetFile);
          config.concat.debug.files[target.key] = target.val;
          return target;
      } else if (ext == ".coffee") { //合并coffee
          targetFile = file.replace(/\.coffee/gi, ".js").replace(/coffee/gi, 'debug'+path.sep+'js');
          var target = combileJS(file, targetFile);
          config.coffee.debug.files[target.key] = [target.val];
          return target;
      }
      return targetFile;
  }
  var initFile = function () {//初始化配置
      var sassDir = devPath + "sass";
      var files = fs.readdirSync(sassDir);
      for (var j = 0; j < files.length; j++) {
          if (path.extname(files[j]) != '.scss') {
              continue;
          }
          var currentName = files[j].substr(0, files[j].length - 5);
          //是否只编译指定的文件
          if (cf.css != undefined && cf.css.indexOf(currentName) == -1) { 
              continue;
          }
          config.sass.dev.files[debugPath + "css" + path.sep + currentName + ".css"] = sassDir + path.sep + files[j];
          config.sass.release.files[relPath + "css" + path.sep + currentName + ".css"] = sassDir + path.sep + files[j];
      }
      grunt.config.init(config);
  }
  
  grunt.event.on('watch', function (action, filepath, target) {
    console.log("action:" + action);
      if (action == 'deleted') {
          if (target == "sass") {
              grunt.task.run(["combile", "sass:dev"]); //重新合并文件后，再编译
          }
          return;
      }
      var task = null;
      var files = {};
      var compileFile = watchFile(filepath);
      switch (target) {
          case "jade":
              files[compileFile] = filepath;
              grunt.config(["jade", "compile", "files"], files);
              task = "jade:compile";
              break;
          case "js":
              files[compileFile.key] = compileFile.val;
              grunt.config(["concat", "debug", "files"], files);
              task = "concat:debug";
              break;
          case "coffee":
              files[compileFile.key] = compileFile.val;
              grunt.config(["coffee", "debug", "files"], files);
              task = "coffee:debug";
              break;
          case "sass":
              task = "sass:dev";
              break;
      }
      if (task !== null) {
          grunt.task.run(task);
      }
  });
  grunt.registerTask("jsRelease", function () {
      var dirs = ["js/", "js/mods/", "js/page/"];
      var sourcePath = debugPath;
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
          }
      }
  });
  //初始化目录结构
  grunt.registerTask("init", function () {
      if (!fs.existsSync(devPath)) {
          var projectPath = path.resolve(devPath, "..");
          if (!fs.existsSync(projectPath)) {
              fs.mkdirSync(projectPath);
          }
          fs.mkdirSync(devPath);
      }
      if (!fs.existsSync(relPath)) {
          fs.mkdirSync(relPath);
      }
      var dirs = [relPath, relPath + 'css/', relPath + 'js/', relPath + 'js/mods/',
          relPath + 'js/page/', debugPath, debugPath + 'css/', debugPath + 'css/base/', debugPath + 'css/mods/',
          debugPath + 'js/', debugPath + 'js/base/', debugPath + 'js/mods/', debugPath + 'js/page/', jadePath, jadePath + 'base/', jadePath + 'mods/',
          devPath + 'coffee/', devPath + 'coffee/page/', devPath + 'coffee/mods/', devPath + 'js/', devPath + 'js/base/',
          devPath + 'js/mods/', devPath + 'js/page/', devPath + 'sass/', devPath + 'sass/base/', devPath + 'sass/mods/'];
      for (var i = 0; i < dirs.length; i++) {
          grunt.log.writeln(dirs[i]);
          if (!fs.existsSync(dirs[i])) {
              fs.mkdirSync(dirs[i]);
          }
      }
      grunt.log.writeln("Init Finish");
  });

  //合并scss 索引文件
  grunt.registerTask("combile", function () {
      var dirs = ["jade"+ path.sep, "js"+ path.sep, "coffee"+ path.sep, "sass"+ path.sep ];
      for (var j = 0; j < dirs.length; j++) {
        var dir = dirs[j];
        if (!fs.existsSync(devPath + dir)) {
          continue;
        }
        var files = fs.readdirSync(devPath + dir);
        for (var i = files.length - 1; i >= 0; i--) {
          var currentFile = devPath + dir + files[i];
          //是否是文件夹
          if (grunt.file.isDir(currentFile)) {
            var subFiles = fs.readdirSync(currentFile);
            for (var q = 0; q < subFiles.length; q++) {
              watchFile(currentFile + path.sep + subFiles[q]);
            }
            continue;
          }
          watchFile(currentFile);
        }
      }
      var sassDir = devPath + "sass"+ path.sep;
      var combile = {};
      combile[cf.sass] = [];
      if (fs.readdirSync(sassDir + "base").length > 0)
        combile[cf.sass].push("base");
      if (fs.readdirSync(sassDir + "mods").length > 0)
        combile[cf.sass].push("mods");
      var list = function (dirs, name) {
        var container = [];
        for (var i = 0; i < dirs.length; i++) {
          var currentPath = sassDir + dirs[i];
          if (!grunt.file.isDir(currentPath))
            continue;
          var fileList = fs.readdirSync(currentPath);
          for (var p = 0; p < fileList.length; p++) {
            var currentFile = currentPath + path.sep + fileList[p];
            if (grunt.file.isFile(currentFile) && currentFile.indexOf(".scss") > 0 && cf.sass != fileList[p] && currentFile.indexOf("/all.scss") == -1) {
                if(fileList[p][0]=="."){
                  continue;
                }else if(fileList[p][0]=="_"){
                  container.unshift(dirs[i] + "/" + fileList[p]);
                }else{
                  container.push(dirs[i] + "/" + fileList[p]);
                }
              }
            }
          }
          if (container.length > 0) {
              combile[name] = container;
          }
      }

      list(["base", "mods", "page"], cf.sass);
      var files = fs.readdirSync(sassDir);
      for (var i = files.length - 1; i >= 0; i--) { //合并其它文件夹
          var file = files[i];
          var currentPath = sassDir + file;
          if (grunt.file.isDir(currentPath) && "base|mods|page".indexOf(file) < 0) {
              var name = path.basename(file);
              list([file], name);
          }
      }

      for (var key in combile) {
          if (combile[key].length == 0)
              continue;
          var content = combile[key].join('";\n@import "');
          var sassFile = null;
          if (key == cf.sass) {
              sassFile = devPath + "sass/" + key;
          } else {
              sassFile = devPath + "sass/" + key + "/all.scss";
          }
          if (grunt.file.isFile(sassFile)) {
              grunt.file.delete(sassFile);
          }
          grunt.file.write(sassFile, '@import "' + content + '"');
      }
  });

  //创建文件
  grunt.registerTask("c", function (filename) {
      var files = [];
      var extname = path.extname(filename);
      if (".jade|.js|.scss|.coffee".indexOf(extname) < 0 || !extname) {
          grunt.log.writeln("Error File Type");
          grunt.log.writeln("Created '" + filename + "' Fail");
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
              fs.open(file, 'w', '0644', function (e, fd) {
                  grunt.log.writeln(fd);
                  if (e) throw e;
                  grunt.file.write(fd, "", {
                      encoding: "utf8"
                  });
                  grunt.log.writeln("create " + file + " Success");
              });
          }
      }
  });
  initFile();
  grunt.registerTask('default', ["combile", "jsRelease", "sass:release", "concat:release", "uglify:release"]);
  grunt.registerTask('test', ["combile", "concat:debug", "coffee:debug", "sass:dev", "jade:compile"]);
  grunt.registerTask('start', ["connect:livereload", "watch"]);
};