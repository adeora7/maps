//configuration variables start
var levels = 7;
//configuration variables end

var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var moment = require('moment');
var path = require('path');
var serveIndex = require('serve-index');
var fs = require('fs');
var app = express();
var server = app.listen(9612, function() {
  console.log('Node app is running on port', app.get('port'));
});
var io = require('socket.io')(server);
var sockets = {};
//socket io functions start

io.on('connection', function(socket){
  sockets[socket.id]= app.get('views') + "static/mapData";
  console.log("one user connected");
  socket.on('zoomOut', function(message){
    console.log(message);
    if(sockets[socket.id] == app.get('views') + "static/mapData"){
      console.log("can't Zoom out anymore");
    }
    else{
      var currPath = sockets[socket.id].split("/");
      currPath = currPath.slice(0, -1);
      sockets[socket.id] = currPath.join('/');
      readDir( sockets[socket.id], socket, "world", function(request, response, dirResponse){
        var uv = { "urls" : dirResponse, "path": sockets[socket.id]} ;
        socket.emit('updatedView', JSON.stringify(uv));
      });
    }
  });
  socket.on('zoomIn', function(message){
    console.log("Zoom in to grid " + message);
    if(sockets[socket.id].split('/').length < 6 + levels ){
      sockets[socket.id] = sockets[socket.id] + "/" + message;
    }

    readDir( sockets[socket.id], socket, "world", function(request, response, dirResponse){
      var uv = { "urls" : dirResponse, "path": sockets[socket.id]} ;
      socket.emit('updatedView', JSON.stringify(uv));
    });
  
  });
  socket.on('updateView', function(message){
    console.log(message);
    if(message == "Zoom out")
    {
      if(sockets[socket.id] == app.get('views') + "static/mapData"){
        console.log("can't Zoom out anymore");
      }
      else{
        var currPath = sockets[socket.id].split("/");
        currPath = currPath.slice(0, -1);
        sockets[socket.id] = currPath.join('/');
        readDir( sockets[socket.id], socket, "world", function(request, response, dirResponse){
          socket.emit('updatedView', JSON.stringify(dirResponse));
        });

      }
    }
    else
    {
      console.log("abhi Zoom in ka baad mei  sochenge");
    }
  });

  socket.on('disconnect', function(){
    console.log(socket.id + " disconnected");
    delete sockets[socket.id];
  });
});

//socket io functions end


app.set('port', (process.env.PORT || 9611));

app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ extended: true }));

// views is directory for all template files
app.set('views', __dirname + '/views/');
app.set('mapData', __dirname + '/mapData/');
app.use(express.static(__dirname + '/views/static'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use('/ftp', serveIndex(app.get('views')+'static/', {'icons': true, 'template': makeEntry}));

function makeEntry(info, callback) {
  const files = info.fileList.map(file => {
    const st = file.stat;
   const typeClass = st.isDirectory() ? "dir" : "file";
    const parts = info.directory.split('/').concat(file.name).map(function (c) { return encodeURIComponent(c); });
    const url = path.normalize(parts.join('/')).split(path.sep).join('/');
    const size = st.size;
    const date = st.mtime.toLocaleDateString();
    const time = st.mtime.toLocaleTimeString();
    return `
      <div class="entry ${typeClass}">
        <a href="${url}">
          <span class="name">${file.name}</span>
          <span class="size">${size} b</span>
          <span class="date">${date}</span>
          <span class="time">${time}</span>
        </a>
      </div>
    `;
  });
    callback(null, `
    <style>
      ${info.style}
    </style>
    <div class="directory">
      <div class="dir">${info.directory}</div>
      <div class="filelist">
       ${files.join("\n")}
      </div>
    </div>
  `);
}

app.get('/', function(request, response) {
  readDir(app.get('views') + 'static/mapData', request, response, function(request, response, dirResponse){
    response.render(app.get('views')+'index.html', {data: dirResponse});
  });
});

app.get('/error', function(request, response){
	response.send("Some error occured. Let me work on it in peace.");
});

function readDir(dirname, request, response, callback){
  fs.readdir(dirname, function(err, filenames){
    if(err){
      console.log(err);
      if(callback){
        callback(request, response, "some error occured");
        return;
      }
      else{
        return "some error occured";
      }
    }
    else
    {
      console.log(filenames.length);
      var images = [];
      filenames.forEach(function(file){
        if(path.extname(file) == ".jpg"){
          images.push(file);
        }
      });
      if(callback){
        callback(request, response, images);
        return;
      }
      else{
        return images;
      }
    }
  });
}