var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var session = require('express-session');
var moment = require('moment');
var MySQLStore = require('express-mysql-session')(session);
var sessionStore = new MySQLStore(options);
var mysql = require('mysql');
var path = require('path');
var serveIndex = require('serve-index');

var options = {
    host: 'localhost',
    port: 3306,
    user: 'topcoder',
    password: 'password',
    database: 'topcoder'
};
var connection = mysql.createConnection(options); // or mysql.createPool(options); 
var sessionStore = new MySQLStore({}/* session store options */, connection);

connection.connect(function(err){
	if(!err)
		console.log("Database connected\n");
	else
	{
		console.log("Error whilte connecting to database\n");
		console.log(err);
	}
});

var app = express();
app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

app.set('port', (process.env.PORT || 9611));

app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ extended: true }));

// views is directory for all template files
app.set('views', __dirname + '/views/');
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
	response.render(app.get('views')+'index.html', {data: "Welcome to worst maps ever"});
});

app.get('/error', function(request, response){
	response.send("Some error occured. Let me work on it in peace.");
});

app.listen(9612, function() {
	console.log('Node app is running on port', app.get('port'));
});